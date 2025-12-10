/*
Universal Realtime Extension for HTMX
============================
This extension adds unified support for WebSockets, Server-Sent Events, and Long-Polling
with automatic fallback mechanisms for real-time UI updates.
*/

(function() {
  if (htmx.version && !htmx.version.startsWith('1.')) {
    console.warn('WARNING: You are using an htmx 1 extension with htmx ' + htmx.version +
      '.  It is recommended that you move to the version of this extension found on https://htmx.org/extensions')
  }

  /** @type {import("../htmx").HtmxInternalApi} */
  var api

  // Connection states
  const CONNECTION_STATES = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    ERROR: 'error'
  }

  // Default configuration
  const defaultConfig = {
    // Auto-detect best transport mechanism
    autoDetect: true,
    // Transport priority order
    transportPriority: ['websocket', 'sse', 'long-polling'],
    // Reconnection settings
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    reconnectDelayMultiplier: 2,
    maxReconnectDelay: 30000,
    // Heartbeat settings
    heartbeatInterval: 30000,
    heartbeatMessage: 'ping',
    // Message queue settings
    maxQueueSize: 100,
    dropOldMessages: true,
    // Connection state indicator
    indicatorClass: 'htmx-realtime-indicator'
  }

  // Active connections by URL
  const connections = new Map()

  htmx.defineExtension('realtime', {

    /**
     * init is called once, when this extension is first registered.
     * @param {import("../htmx").HtmxInternalApi} apiRef
     */
    init: function(apiRef) {
      // Store reference to internal API
      api = apiRef

      // Merge configuration
      if (!htmx.config.realtime) {
        htmx.config.realtime = { ...defaultConfig }
      } else {
        htmx.config.realtime = { ...defaultConfig, ...htmx.config.realtime }
      }

      // Initialize connection state indicators
      initConnectionIndicators()
    },

    /**
     * onEvent handles all events passed to this extension.
     *
     * @param {string} name
     * @param {Event} evt
     */
    onEvent: function(name, evt) {
      var parent = evt.target || evt.detail.elt
      switch (name) {
        // Clean up connections when elements are removed
        case 'htmx:beforeCleanupElement':
          cleanupElementConnections(parent)
          return

        // Initialize realtime connections when elements are processed
        case 'htmx:beforeProcessNode':
          forEach(queryAttributeOnThisOrChildren(parent, 'realtime-connect'), function(child) {
            ensureRealtimeConnection(child)
          })
          forEach(queryAttributeOnThisOrChildren(parent, 'realtime-send'), function(child) {
            setupRealtimeSend(child)
          })
      }
    }
  })

  /**
   * Initialize connection state indicators
   */
  function initConnectionIndicators() {
    // Create indicator element if it doesn't exist
    if (!document.querySelector('.' + htmx.config.realtime.indicatorClass)) {
      const indicator = document.createElement('div')
      indicator.className = htmx.config.realtime.indicatorClass
      indicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: #dc3545;
        transition: background-color 0.3s ease;
        z-index: 9999;
        box-shadow: 0 0 4px rgba(0,0,0,0.3);
      `
      indicator.title = 'Realtime connection state'
      document.body.appendChild(indicator)
    }
  }

  function updateConnectionIndicator(state) {
    const indicator = document.querySelector('.' + htmx.config.realtime.indicatorClass)
    if (!indicator) return

    switch (state) {
      case CONNECTION_STATES.CONNECTED:
        indicator.style.backgroundColor = '#28a745'
        break
      case CONNECTION_STATES.CONNECTING:
        indicator.style.backgroundColor = '#ffc107'
        break
      case CONNECTION_STATES.ERROR:
        indicator.style.backgroundColor = '#dc3545'
        break
      default:
        indicator.style.backgroundColor = '#6c757d'
    }
  }

  function forEach(elements, callback) {
    if (elements) {
      for (var i = 0; i < elements.length; i++) {
        callback(elements[i])
      }
    }
  }

  function queryAttributeOnThisOrChildren(element, attribute) {
    var result = []
    if (element.hasAttribute(attribute)) {
      result.push(element)
    }
    result.push.apply(result, element.querySelectorAll('[' + attribute + ']'))
    return result
  }

  function ensureRealtimeConnection(element) {
    const url = api.getAttributeValue(element, 'realtime-connect')
    if (!url) return

    // Check for existing connection
    if (connections.has(url)) {
      const connection = connections.get(url)
      connection.elements.add(element)
      return
    }

    // Create new connection
    createRealtimeConnection(url, element)
  }

  function createRealtimeConnection(url, element) {
    const config = htmx.config.realtime
    const connection = {
      url,
      elements: new Set([element]),
      state: CONNECTION_STATES.DISCONNECTED,
      transport: null,
      reconnectAttempts: 0,
      messageQueue: [],
      heartbeatInterval: null
    }

    connections.set(url, connection)

    // Attempt to connect with best available transport
    connectWithBestTransport(connection)
  }

  function connectWithBestTransport(connection) {
    const config = htmx.config.realtime
    const transports = config.autoDetect ? config.transportPriority : [config.transport]

    function tryTransport(index) {
      if (index >= transports.length) {
        connection.state = CONNECTION_STATES.ERROR
        updateConnectionIndicator(connection.state)
        triggerEvent(connection, 'htmx:realtime:error', { error: 'No available transports' })
        return
      }
      const transport = transports[index]
      switch (transport) {
        case 'websocket':
          if (window.WebSocket) {
            connectWebSocket(connection)
            return
          }
          break
        case 'sse':
          if (window.EventSource) {
            connectSSE(connection)
            return
          }
          break
        case 'long-polling':
          connectLongPolling(connection)
          return
      }

      // Try next transport
      tryTransport(index + 1)
    }

    tryTransport(0)
  }

  function connectWebSocket(connection) {
    connection.state = CONNECTION_STATES.CONNECTING
    updateConnectionIndicator(connection.state)

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = connection.url.startsWith('ws') ? connection.url : protocol + '//' + window.location.host + connection.url
    const socket = new WebSocket(wsUrl)

    connection.transport = socket

    socket.onopen = function() {
      connection.state = CONNECTION_STATES.CONNECTED
      connection.reconnectAttempts = 0
      updateConnectionIndicator(connection.state)
      triggerEvent(connection, 'htmx:realtime:connected', { transport: 'websocket' })

      // Send queued messages
      while (connection.messageQueue.length > 0) {
        const message = connection.messageQueue.shift()
        socket.send(message)
      }

      // Start heartbeat
      startHeartbeat(connection)
    }

    socket.onmessage = function(event) {
      handleRealtimeMessage(connection, event.data)
    }

    socket.onerror = function(error) {
      connection.state = CONNECTION_STATES.ERROR
      updateConnectionIndicator(connection.state)
      triggerEvent(connection, 'htmx:realtime:error', { error, transport: 'websocket' })
    }

    socket.onclose = function() {
      connection.state = CONNECTION_STATES.DISCONNECTED
      updateConnectionIndicator(connection.state)
      triggerEvent(connection, 'htmx:realtime:disconnected')

      // Attempt reconnection
      attemptReconnection(connection)
    }
  }

  function connectSSE(connection) {
    connection.state = CONNECTION_STATES.CONNECTING
    updateConnectionIndicator(connection.state)

    const sseUrl = connection.url.startsWith('http') ? connection.url : window.location.origin + connection.url
    const source = new EventSource(sseUrl)

    connection.transport = source

    source.onopen = function() {
      connection.state = CONNECTION_STATES.CONNECTED
      connection.reconnectAttempts = 0
      updateConnectionIndicator(connection.state)
      triggerEvent(connection, 'htmx:realtime:connected', { transport: 'sse' })
    }

    source.onmessage = function(event) {
      handleRealtimeMessage(connection, event.data)
    }

    source.onerror = function(error) {
      connection.state = CONNECTION_STATES.ERROR
      updateConnectionIndicator(connection.state)
      triggerEvent(connection, 'htmx:realtime:error', { error, transport: 'sse' })
      source.close()

      // Attempt reconnection
      attemptReconnection(connection)
    }
  }

  function connectLongPolling(connection) {
    connection.state = CONNECTION_STATES.CONNECTING
    updateConnectionIndicator(connection.state)

    function poll() {
      if (connection.state !== CONNECTION_STATES.CONNECTED && connection.state !== CONNECTION_STATES.CONNECTING) {
        return
      }

      const xhr = new XMLHttpRequest()
      xhr.open('GET', connection.url, true)
      xhr.setRequestHeader('Accept', 'text/html, application/json')
      xhr.setRequestHeader('X-HX-Request', 'true')

      xhr.onload = function() {
        if (xhr.status === 200) {
          connection.state = CONNECTION_STATES.CONNECTED
          connection.reconnectAttempts = 0
          updateConnectionIndicator(connection.state)

          handleRealtimeMessage(connection, xhr.responseText)

          // Immediately poll again
          setTimeout(poll, 100)
        } else {
          handleLongPollError(connection)
        }
      }

      xhr.onerror = function() {
        handleLongPollError(connection)
      }

      xhr.onabort = function() {
        connection.state = CONNECTION_STATES.DISCONNECTED
        updateConnectionIndicator(connection.state)
      }

      xhr.send()
    }

    function handleLongPollError(connection) {
      connection.state = CONNECTION_STATES.ERROR
      updateConnectionIndicator(connection.state)
      triggerEvent(connection, 'htmx:realtime:error', { error: 'Long poll failed', transport: 'long-polling' })

      // Attempt reconnection
      attemptReconnection(connection)
    }

    poll()
    connection.transport = { abort: function() { connection.state = CONNECTION_STATES.DISCONNECTED } }
  }

  function startHeartbeat(connection) {
    if (connection.heartbeatInterval) {
      clearInterval(connection.heartbeatInterval)
    }

    connection.heartbeatInterval = setInterval(function() {
      if (connection.state === CONNECTION_STATES.CONNECTED && connection.transport.send) {
        connection.transport.send(htmx.config.realtime.heartbeatMessage)
      }
    }, htmx.config.realtime.heartbeatInterval)
  }

  function stopHeartbeat(connection) {
    if (connection.heartbeatInterval) {
      clearInterval(connection.heartbeatInterval)
      connection.heartbeatInterval = null
    }
  }

  function attemptReconnection(connection) {
    const config = htmx.config.realtime
    if (connection.reconnectAttempts >= config.reconnectAttempts) {
      connection.state = CONNECTION_STATES.ERROR
      updateConnectionIndicator(connection.state)
      triggerEvent(connection, 'htmx:realtime:failed')
      return
    }

    connection.reconnectAttempts++
    const delay = config.reconnectDelay * Math.pow(config.reconnectDelayMultiplier, connection.reconnectAttempts - 1)
    const actualDelay = Math.min(delay, config.maxReconnectDelay)

    setTimeout(function() {
      if (connection.state === CONNECTION_STATES.DISCONNECTED) {
        connectWithBestTransport(connection)
      }
    }, actualDelay)
  }

  function handleRealtimeMessage(connection, data) {
    // Trigger message event
    triggerEvent(connection, 'htmx:realtime:message', { data })

    // Try to parse as HTML
    if (typeof data === 'string' && (data.startsWith('<') || data.includes('<!DOCTYPE'))) {
      // Update all connected elements
      connection.elements.forEach(function(element) {
        api.withExtensions(element, function(extension) {
          if (extension.handleRealtimeMessage) {
            extension.handleRealtimeMessage(element, data)
          } else {
            // Default behavior: swap HTML into element
            api.innerHTML(element, data)
            api.triggerEvent(element, 'htmx:realtime:swap')
          }
        })
      })
    } else if (typeof data === 'string') {
      // Try to parse as JSON
      try {
        const json = JSON.parse(data)
        triggerEvent(connection, 'htmx:realtime:json', { data: json })
      } catch (e) {
        // Plain text message
        triggerEvent(connection, 'htmx:realtime:text', { data })
      }
    }
  }

  function setupRealtimeSend(element) {
    const url = api.getAttributeValue(element, 'realtime-send')
    if (!url) return

    api.addEventListener(element, 'submit', function(evt) {
      evt.preventDefault()

      const connection = connections.get(url)
      if (!connection || connection.state !== CONNECTION_STATES.CONNECTED) {
        triggerEvent(element, 'htmx:realtime:notconnected')
        return
      }

      const values = api.values(element)
      const data = JSON.stringify(values)

      if (connection.transport.send) {
        connection.transport.send(data)
      } else {
        // Fallback to AJAX for long-polling
        const xhr = new XMLHttpRequest()
        xhr.open('POST', url, true)
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.send(data)
      }

      triggerEvent(element, 'htmx:realtime:sented', { data })
    })
  }

  function triggerEvent(connection, eventName, detail) {
    connection.elements.forEach(function(element) {
      api.triggerEvent(element, eventName, detail)
    })
  }

  function cleanupElementConnections(element) {
    // Remove element from all connections
    connections.forEach(function(connection) {
      connection.elements.delete(element)

      // Clean up connection if no elements remain
      if (connection.elements.size === 0) {
        if (connection.transport) {
          if (connection.transport.close) {
            connection.transport.close()
          } else if (connection.transport.abort) {
            connection.transport.abort()
          }
        }

        stopHeartbeat(connection)
        connections.delete(connection.url)
        updateConnectionIndicator(CONNECTION_STATES.DISCONNECTED)
      }
    })
  }
})()
