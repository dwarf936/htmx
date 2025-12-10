/*
Realtime Extension
============================
This extension adds unified support for WebSockets, SSE, and long-polling with automatic fallback
to htmx. Provides consistent interface for real-time UI updates.
*/

(function () {

	if (htmx.version && !htmx.version.startsWith("1.")) {
		console.warn("WARNING: You are using an htmx 1 extension with htmx " + htmx.version +
			".  It is recommended that you move to the version of this extension found on https://htmx.org/extensions")
	}

	/** @type {import("../htmx").HtmxInternalApi} */
	var api;

	// Connection states
	const ConnectionState = {
		DISCONNECTED: 'disconnected',
		CONNECTING: 'connecting',
		CONNECTED: 'connected',
		RECONNECTING: 'reconnecting'
	};

	// Message queue for ensuring delivery order
	class MessageQueue {
		constructor() {
			this.queue = [];
			this.processing = false;
		}

		enqueue(message, handler) {
			this.queue.push({ message, handler });
			this.process();
		}

		async process() {
			if (this.processing || this.queue.length === 0) return;
			
			this.processing = true;
			
			while (this.queue.length > 0) {
				const item = this.queue.shift();
				try {
					await item.handler(item.message);
				} catch (error) {
					console.error('Failed to process message:', error);
				}
			}
			
			this.processing = false;
		}

		clear() {
			this.queue = [];
		}
	}

	// Connection manager handles the connection and fallback logic
	class ConnectionManager {
		constructor(url, options = {}) {
			this.url = url;
			this.options = options;
			this.state = ConnectionState.DISCONNECTED;
			this.connection = null;
			this.reconnectAttempts = 0;
			this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
			this.messageQueue = new MessageQueue();
			this.preferredProtocol = options.preferredProtocol || 'websocket';
			this.availableProtocols = this.detectAvailableProtocols();
			this.currentProtocol = null;
			this.heartbeatInterval = null;
			this.heartbeatRate = options.heartbeatRate || 30000;
		}

		// Detect available protocols in the current environment
		detectAvailableProtocols() {
			const protocols = [];
			
			if (window.WebSocket) {
				protocols.push('websocket');
			}
			
			if (window.EventSource) {
				protocols.push('sse');
			}
			
			protocols.push('long-polling');
			
			return protocols;
		}

		// Select the best available protocol based on preference and environment
		selectBestProtocol() {
			// Try preferred protocol first
			if (this.availableProtocols.includes(this.preferredProtocol)) {
				return this.preferredProtocol;
			}

			// Fall back to next available protocol
			for (const protocol of ['websocket', 'sse', 'long-polling']) {
				if (this.availableProtocols.includes(protocol)) {
					return protocol;
				}
			}

			return null;
		}

		// Establish connection using the best available protocol
		async connect() {
			if (this.state !== ConnectionState.DISCONNECTED) {
				return;
			}

			this.state = ConnectionState.CONNECTING;
			this.notifyStateChange();

			this.currentProtocol = this.selectBestProtocol();

			try {
				switch (this.currentProtocol) {
					case 'websocket':
						await this.connectWebSocket();
						break;
					case 'sse':
						await this.connectSSE();
						break;
					case 'long-polling':
						await this.connectLongPolling();
						break;
				}

				this.state = ConnectionState.CONNECTED;
				this.reconnectAttempts = 0;
				this.notifyStateChange();
				this.startHeartbeat();

			} catch (error) {
				console.error(`Failed to connect via ${this.currentProtocol}:`, error);
				this.state = ConnectionState.DISCONNECTED;
				this.notifyStateChange();
				this.scheduleReconnect();
			}
		}

		// WebSocket connection
		connectWebSocket() {
			return new Promise((resolve, reject) => {
				const socketUrl = this.url.replace(/^http/, 'ws');
				this.connection = new WebSocket(socketUrl);

				this.connection.onopen = () => resolve();
				
				this.connection.onmessage = (event) => {
					this.handleMessage(event.data);
				};

				this.connection.onerror = (error) => {
					console.error('WebSocket error:', error);
					reject(error);
				};

				this.connection.onclose = () => {
					this.handleDisconnect();
				};
			});
		}

		// SSE connection
		connectSSE() {
			return new Promise((resolve, reject) => {
				const sseUrl = this.url;
				this.connection = new EventSource(sseUrl);

				this.connection.onopen = () => resolve();
				
				this.connection.onmessage = (event) => {
					this.handleMessage(event.data);
				};

				this.connection.addEventListener('htmx:update', (event) => {
					this.handleMessage(event.data);
				});

				this.connection.onerror = (error) => {
					console.error('SSE error:', error);
					reject(error);
				};
			});
		}

		// Long-polling connection
		connectLongPolling() {
			return this.poll();
		}

		// Long-polling loop
		async poll() {
			try {
				const response = await fetch(this.url, {
					method: 'GET',
					headers: {
						'Accept': 'text/html'
					}
				});

				if (response.ok) {
					const data = await response.text();
					this.handleMessage(data);
				}

				if (this.state === ConnectionState.CONNECTED) {
					setTimeout(() => this.poll(), 1000);
				}

			} catch (error) {
				console.error('Long-polling error:', error);
				if (this.state === ConnectionState.CONNECTED) {
					setTimeout(() => this.poll(), 5000);
				}
			}
		}

		// Handle incoming messages
		handleMessage(data) {
			this.messageQueue.enqueue(data, (message) => {
				this.processMessage(message);
			});
		}

		// Process message and update UI via HTMX
		async processMessage(message) {
			try {
				// Parse message if it's JSON
				let parsedMessage;
				try {
					parsedMessage = JSON.parse(message);
				} catch (e) {
					parsedMessage = { content: message };
				}

				// Update target element with received content
				if (parsedMessage.target && parsedMessage.content) {
					const target = document.querySelector(parsedMessage.target);
					if (target) {
						apiWithExtensions(target, 'outerHTML', parsedMessage.content);
					}
				} else if (parsedMessage.content) {
					// If no target specified, trigger a custom event
					const event = new CustomEvent('htmx:realtime:message', {
						detail: parsedMessage,
						bubbles: true
					});
					document.dispatchEvent(event);
				}

			} catch (error) {
				console.error('Failed to process message:', error);
			}
		}

		// Send message over the current connection
		sendMessage(message) {
			if (!this.connection || this.state !== ConnectionState.CONNECTED) {
				throw new Error('Not connected to realtime service');
			}

			switch (this.currentProtocol) {
				case 'websocket':
					this.connection.send(JSON.stringify(message));
					break;
				case 'sse':
					// SSE is read-only, send via POST
					fetch(this.url, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(message)
					});
					break;
				case 'long-polling':
					fetch(this.url, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(message)
					});
					break;
			}
		}

		// Start heartbeat to maintain connection
		startHeartbeat() {
			if (this.currentProtocol !== 'websocket') return;

			this.heartbeatInterval = setInterval(() => {
				if (this.connection && this.connection.readyState === WebSocket.OPEN) {
					this.connection.send(JSON.stringify({ type: 'heartbeat' }));
				}
			}, this.heartbeatRate);
		}

		// Stop heartbeat
		stopHeartbeat() {
			if (this.heartbeatInterval) {
				clearInterval(this.heartbeatInterval);
				this.heartbeatInterval = null;
			}
		}

		// Handle connection disconnect
		handleDisconnect() {
			this.state = ConnectionState.DISCONNECTED;
			this.stopHeartbeat();
			this.notifyStateChange();
			this.scheduleReconnect();
		}

		// Schedule reconnection with exponential backoff
		scheduleReconnect() {
			if (this.reconnectAttempts >= this.maxReconnectAttempts) {
				console.error('Max reconnection attempts reached');
				return;
			}

			this.reconnectAttempts++;
			
			// Calculate delay with full jitter
			const baseDelay = 1000;
			const maxDelay = 30000;
			const delay = Math.min(
				baseDelay * Math.pow(2, this.reconnectAttempts) * (0.5 + Math.random()),
				maxDelay
			);

			this.state = ConnectionState.RECONNECTING;
			this.notifyStateChange();

			setTimeout(() => {
				this.connect();
			}, delay);
		}

		// Notify state changes via events
		notifyStateChange() {
			const event = new CustomEvent('htmx:realtime:statechange', {
				detail: {
					state: this.state,
					protocol: this.currentProtocol,
					reconnectAttempts: this.reconnectAttempts
				},
				bubbles: true
			});
			document.dispatchEvent(event);
		}

		// Close connection
		close() {
			this.state = ConnectionState.DISCONNECTED;
			this.stopHeartbeat();
			
			if (this.connection) {
				if (this.currentProtocol === 'websocket') {
					this.connection.close();
				} else if (this.currentProtocol === 'sse') {
					this.connection.close();
				}
				this.connection = null;
			}
			
			this.notifyStateChange();
		}
	}

	htmx.defineExtension("realtime", {

		/**
		 * init is called once, when this extension is first registered.
		 * @param {import("../htmx").HtmxInternalApi} apiRef
		 */
		init: function (apiRef) {

			// Store reference to internal API
			api = apiRef;

			// Default configuration
			if (!htmx.config.realtimeReconnectDelay) {
				htmx.config.realtimeReconnectDelay = "full-jitter";
			}

			// Register global realtime manager creator
			if (!htmx.createRealtimeConnection) {
				htmx.createRealtimeConnection = function(url, options) {
					return new ConnectionManager(url, options);
				};
			}

			// Add connection state indicator styles
			this.addIndicatorStyles();
		},

		/**
		 * Add connection state indicator styles
		 */
		addIndicatorStyles: function() {
			const style = document.createElement('style');
			style.textContent = `
				.htmx-realtime-indicator {
					display: inline-block;
					width: 8px;
					height: 8px;
					border-radius: 50%;
					margin-left: 4px;
					transition: background-color 0.3s ease;
				}
				.htmx-realtime-indicator.disconnected {
					background-color: #ef4444;
				}
				.htmx-realtime-indicator.connecting {
					background-color: #fbbf24;
					animation: pulse 1.5s infinite;
				}
				.htmx-realtime-indicator.connected {
					background-color: #22c55e;
				}
				.htmx-realtime-indicator.reconnecting {
					background-color: #f59e0b;
					animation: pulse 1s infinite;
				}
				@keyframes pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.5; }
				}
			`;
			document.head.appendChild(style);
		},

		/**
		 * onEvent handles all events passed to this extension.
		 *
		 * @param {string} name
		 * @param {Event} evt
		 */
		onEvent: function (name, evt) {
			var parent = evt.target || evt.detail.elt;

			switch (name) {

				// Clean up connections when elements are removed
				case "htmx:beforeCleanupElement":
					var internalData = api.getInternalData(parent);

					if (internalData.realtimeConnection) {
						internalData.realtimeConnection.close();
					}
					return;

				// Initialize realtime connections when elements are processed
				case "htmx:beforeProcessNode":
					forEach(queryAttributeOnThisOrChildren(parent, "realtime-connect"), function (child) {
						ensureRealtimeConnection(child);
					});
					forEach(queryAttributeOnThisOrChildren(parent, "realtime-send"), function (child) {
						ensureRealtimeSend(child);
					});
					break;

				// Update connection state indicators
				case "htmx:realtime:statechange":
					updateConnectionIndicators(evt.detail);
					break;
			}
		}
	});

	/**
	 * updateConnectionIndicators updates the UI to reflect current connection state
	 */
	function updateConnectionIndicators(state) {
		const indicators = document.querySelectorAll('.htmx-realtime-indicator');
		indicators.forEach(indicator => {
			indicator.className = `htmx-realtime-indicator ${state.state}`;
		});
	}

	/**
	 * ensureRealtimeConnection creates a new realtime connection on the designated element
	 * @param {HTMLElement} elt
	 */
	function ensureRealtimeConnection(elt) {
		if (!api.bodyContains(elt)) {
			return;
		}

		var internalData = api.getInternalData(elt);
		var url = api.getAttributeValue(elt, "realtime-connect");

		if (internalData.realtimeConnection) {
			if (internalData.realtimeConnection.url === url) {
				return;
			} else {
				internalData.realtimeConnection.close();
			}
		}

		// Parse options from attribute
		var options = {};
		var optionsAttr = api.getAttributeValue(elt, "realtime-options");
		if (optionsAttr) {
			try {
				options = JSON.parse(optionsAttr);
			} catch (e) {
				console.error('Failed to parse realtime options:', e);
			}
		}

		// Create connection manager
		var connection = htmx.createRealtimeConnection(url, options);
		internalData.realtimeConnection = connection;

		// Connect
		connection.connect();

		// Create connection indicator if requested
		if (api.getAttributeValue(elt, "realtime-indicator") !== null) {
			createConnectionIndicator(elt, connection);
		}
	}

	/**
	 * createConnectionIndicator creates a visual indicator for connection state
	 */
	function createConnectionIndicator(elt, connection) {
		const indicator = document.createElement('span');
		indicator.className = 'htmx-realtime-indicator disconnected';
		indicator.title = 'Realtime Connection State';
		elt.appendChild(indicator);
	}

	/**
	 * ensureRealtimeSend sets up elements to send data via realtime connections
	 * @param {HTMLElement} elt
	 */
	function ensureRealtimeSend(elt) {
		if (!api.bodyContains(elt)) {
			return;
		}

		api.addEventHandler(elt, "click", function (evt) {
			if (api.shouldCancel(evt)) {
				return;
			}

			var internalData = api.getInternalData(elt);
			if (!internalData.realtimeConnection) {
				console.error('No realtime connection available to send message');
				return;
			}

			// Get message data
			var message = api.getAttributeValue(elt, "realtime-send");
			try {
				message = JSON.parse(message);
			} catch (e) {
				// Fall back to plain text
			}

			internalData.realtimeConnection.sendMessage(message);
			api.preventDefault(evt);
		});
	}

	/**
	 * queryAttributeOnThisOrChildren returns all nodes that contain the requested attribute, including the parent
	 * @param {HTMLElement} elt
	 * @param {string} attribute
	 */
	function queryAttributeOnThisOrChildren(elt, attribute) {
		var result = [];
		if (api.hasAttribute(elt, attribute)) {
			result.push(elt);
		}
		result.push.apply(result, api.querySelectorAll(elt, "[" + attribute + "]"));
		return result;
	}

	/**
	 * forEach iterates over an array
	 * @param {Array} array
	 * @param {Function} func
	 */
	function forEach(array, func) {
		if (array) {
			for (var i = 0; i < array.length; i++) {
				func(array[i]);
			}
		}
	}

	/**
	 * apiWithExtensions calls HTMX internal api with proper extension handling
	 */
	function apiWithExtensions(target, swapStyle, content) {
		var swapSpec = api.getSwapSpecification(swapStyle);
		var fragment = api.makeFragment(content);
		api.withExtensions(target, function(extension) {
			return extension.transformResponse(content, null, swapSpec, target);
		}, function(transformedContent) {
			var tempDiv = document.createElement('div');
			tempDiv.innerHTML = transformedContent;
			api.swap(target, tempDiv.firstChild, swapSpec);
		});
	}

})();
