/**
 * Svelte HTMX Integration
 *
 * Provides a declarative Svelte component for working with HTMX
 * including attribute binding, event handling, and state synchronization.
 */

/**
 * Htmx Svelte Component
 *
 * Usage:
 * <Htmx
 *   hx-get="/api/data"
 *   hx-target="#result"
 *   hx-swap="innerHTML"
 *   on:htmx-request={(event) => console.log('Request started')}
 *   on:htmx-response={(event) => console.log('Response received')}
 * >
 *   Load Data
 * </Htmx>
 */
export function Htmx(props) {
  let element
  const htmxEventHandlers = {}
  const htmxAttributes = {}

  // Separate HTMX attributes from Svelte props and event handlers
  Object.entries(props).forEach(([key, value]) => {
    // Handle HTMX attributes (hx-*) and data attributes
    if (key.startsWith('hx-') || key.startsWith('data-')) {
      htmxAttributes[key] = value
    } else if (key.startsWith('on:htmx-')) { // Handle HTMX events (on:htmx-*)
      const eventName = key.slice(3)
      htmxEventHandlers[eventName] = value
    }
  })

  // Update HTMX attributes when props change
  $effect(() => {
    if (!element) return

    // Update attributes
    Object.entries(htmxAttributes).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        element.removeAttribute(key)
      } else {
        element.setAttribute(key, value)
      }
    })

    // Process htmx API calls
    if (props.htmxTrigger) {
      htmx.trigger(element, props.htmxTrigger)
    }

    if (props.htmxRefresh) {
      htmx.process(element)
    }
  })

  // Setup event listeners when element mounts
  $effect(() => {
    if (!element) return

    const cleanupFns = []

    // Add HTMX event listeners
    Object.entries(htmxEventHandlers).forEach(([eventName, handler]) => {
      const listener = (event) => {
        handler({ detail: event, event })
      }
      element.addEventListener(eventName, listener)
      cleanupFns.push(() => element.removeEventListener(eventName, listener))
    })

    // Cleanup on unmount
    return () => cleanupFns.forEach(fn => fn())
  })

  // Pass through all non-HTMX props to the underlying element
  const passThroughProps = {}
  Object.entries(props).forEach(([key, value]) => {
    if (
      !key.startsWith('hx-') &&
      !key.startsWith('data-') &&
      !key.startsWith('on:htmx-') &&
      key !== 'htmxTrigger' &&
      key !== 'htmxRefresh'
    ) {
      passThroughProps[key] = value
    }
  })

  return createElement(
    props.tag || 'button',
    { ...passThroughProps, ref: (el) => element = el },
    props.children
  )
}

/**
 * useHtmx Composable
 *
 * Provides programmatic access to HTMX API within Svelte components
 *
 * Usage:
 * const { trigger, process, refresh, ajax } = useHtmx()
 */
export function useHtmx() {
  function trigger(target, eventName, detail) {
    if (typeof htmx === 'undefined') {
      console.warn('htmx is not loaded')
      return
    }
    htmx.trigger(target, eventName, detail)
  }

  function process(target) {
    if (typeof htmx === 'undefined') {
      console.warn('htmx is not loaded')
      return
    }
    htmx.process(target)
  }

  function refresh(target) {
    process(target)
  }

  function ajax(options) {
    if (typeof htmx === 'undefined') {
      console.warn('htmx is not loaded')
      return Promise.reject(new Error('htmx is not loaded'))
    }
    return new Promise((resolve, reject) => {
      htmx.ajax(
        options.method || 'GET',
        options.url,
        {
          ...options,
          target: options.target || document.body,
          swap: options.swap || 'innerHTML',
          onSuccess: (response, elt) => {
            resolve({ response, element: elt })
            options.onSuccess?.(response, elt)
          },
          onError: (error, elt) => {
            reject(new Error(`HTMX request failed: ${error.message || 'Unknown error'}`, { cause: { error, element: elt } }))
            options.onError?.(error, elt)
          }
        }
      )
    })
  }

  function takeClass(target, className) {
    htmx.takeClass(target, className)
  }

  function giveClass(target, className) {
    htmx.giveClass(target, className)
  }

  return {
    trigger,
    process,
    refresh,
    ajax,
    takeClass,
    giveClass,
    htmx: typeof htmx !== 'undefined' ? htmx : null
  }
}

/**
 * Svelte HTMX Plugin for auto-initialization
 */
export function HtmxPlugin() {
  return {
    name: 'htmx-plugin',
    initialize() {
      // Auto-process new elements when they're added to the DOM
      if (typeof htmx !== 'undefined') {
        htmx.config.useTemplateFragments = true
      }
    }
  }
}

// Helper to create elements with Svelte compatibility
function createElement(tag, props, children) {
  const element = document.createElement(tag)

  // Set props
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'ref') {
      value(element)
    } else if (key.startsWith('on:')) {
      const eventName = key.slice(3)
      element.addEventListener(eventName, value)
    } else if (key === 'class') {
      element.className = value
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value)
    } else {
      element.setAttribute(key, value)
    }
  })

  // Add children
  if (children) {
    if (Array.isArray(children)) {
      children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child))
        } else if (child instanceof Node) {
          element.appendChild(child)
        }
      })
    } else if (typeof children === 'string') {
      element.textContent = children
    } else if (children instanceof Node) {
      element.appendChild(children)
    }
  }

  return element
}
