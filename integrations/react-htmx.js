import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

// HTMX React Component
const Htmx = forwardRef((props, ref) => {
  const elementRef = useRef(null)
  const htmxPropsRef = useRef({})

  // Extract HTMX attributes from props
  const getHtmxAttributes = (props) => {
    const htmxAttrs = {}
    const eventHandlers = {}

    Object.entries(props).forEach(([key, value]) => {
      // Handle HTMX attributes (hx-* and data-hx-*)
      if (key.startsWith('hx') || key.startsWith('dataHx')) {
        let attrKey
        if (key.startsWith('dataHx')) {
          attrKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
        } else {
          attrKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
          attrKey = `hx-${attrKey.substring(2)}`
        }
        htmxAttrs[attrKey] = value
      } else if (key.startsWith('onHtmx')) {
        // Handle HTMX events
        const eventName = key.replace(/^onHtmx/, '').replace(/([A-Z])/, '-$1').toLowerCase()
        eventHandlers[`htmx:${eventName}`] = value
      }
    })

    return { htmxAttrs, eventHandlers }
  }

  // Sync props to HTMX attributes
  useEffect(() => {
    const { htmxAttrs, eventHandlers } = getHtmxAttributes(props)
    const element = elementRef.current

    if (!element || !window.htmx) return

    // Clean up old attributes
    Object.keys(htmxPropsRef.current.htmxAttrs || {}).forEach(attr => {
      if (!htmxAttrs[attr]) {
        element.removeAttribute(attr)
      }
    })

    // Clean up old event listeners
    Object.keys(htmxPropsRef.current.eventHandlers || {}).forEach(event => {
      element.removeEventListener(event, htmxPropsRef.current.eventHandlers[event])
    })

    // Set new attributes
    Object.entries(htmxAttrs).forEach(([attr, value]) => {
      element.setAttribute(attr, value)
    })

    // Add new event listeners
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      element.addEventListener(event, handler)
    })

    // Store current props for cleanup
    htmxPropsRef.current = { htmxAttrs, eventHandlers }

    // Process element with HTMX
    window.htmx.process(element)

    // Cleanup on unmount
    return () => {
      Object.keys(eventHandlers).forEach(event => {
        element.removeEventListener(event, eventHandlers[event])
      })
      window.htmx._('cleanupElement')(element)
    }
  }, [props])

  // Expose HTMX API via ref
  useImperativeHandle(ref, () => ({
    triggerEvent: (eventName, detail) => {
      if (elementRef.current && window.htmx) {
        return window.htmx.trigger(elementRef.current, eventName, detail)
      }
    },
    process: () => {
      if (elementRef.current && window.htmx) {
        window.htmx.process(elementRef.current)
      }
    },
    values: () => {
      if (elementRef.current && window.htmx) {
        return window.htmx.values(elementRef.current)
      }
    },
    element: elementRef.current
  }))

  const { as: Component = 'div', children, ...restProps } = props
  const nonHtmxProps = {}

  // Filter out HTMX props from rest props
  Object.entries(restProps).forEach(([key, value]) => {
    if (!(key.startsWith('hx') || key.startsWith('dataHx') || key.startsWith('onHtmx'))) {
      nonHtmxProps[key] = value
    }
  })

  return React.createElement(
    Component,
    {
      ref: elementRef,
      ...nonHtmxProps
    },
    children
  )
})

Htmx.displayName = 'Htmx'

// Helper hook for using HTMX programmatically
export const useHtmx = () => {
  const triggerEvent = (element, eventName, detail) => {
    if (window.htmx) {
      return window.htmx.trigger(element, eventName, detail)
    }
  }

  const ajax = (options) => {
    if (window.htmx) {
      return window.htmx.ajax(options)
    }
  }

  return {
    triggerEvent,
    ajax,
    htmx: window.htmx
  }
}

export default Htmx
