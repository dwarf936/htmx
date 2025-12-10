/**
 * Svelte HTMX Integration
 *
 * Provides a declarative Svelte component for working with HTMX
 * including attribute binding, event handling, and state synchronization.
 * This implementation follows native Svelte component conventions.
 */

/**
 * Htmx Svelte Component
 *
 * Usage:
 * <Htmx
 *   tag="button"
 *   hx-get="/api/data"
 *   hx-target="#result"
 *   hx-swap="innerHTML"
 *   on:htmx-request={(event) => console.log('Request started')}
 * >
 *   Load Data
 * </Htmx>
 */
export const Htmx = {
  props: ['tag', 'htmxTrigger', 'htmxRefresh'],

  emits: [
    'htmx:beforeRequest',
    'htmx:afterRequest',
    'htmx:sendError',
    'htmx:responseError',
    'htmx:timeout',
    'htmx:abort',
    'htmx:beforeSwap',
    'htmx:afterSwap',
    'htmx:beforeSettle',
    'htmx:afterSettle',
    'htmx:beforeCleanupElement',
    'htmx:afterCleanupElement'
  ],

  setup(props, { emit, slots }) {
    const element = $state(null)
    let htmxEventListenerCleanups = []

    // Calculate pass through props (non-HTMX props)
    const passThroughProps = $derived(() => {
      const result = {}
      Object.entries(props).forEach(([key, value]) => {
        if (
          !key.startsWith('hx-') &&
          !key.startsWith('data-') &&
          key !== 'tag' &&
          key !== 'htmxTrigger' &&
          key !== 'htmxRefresh'
        ) {
          result[key] = value
        }
      })
      return result
    })

    // Process HTMX attributes and events when props change
    $effect(() => {
      if (!element) return

      // Update HTMX attributes
      Object.entries(props).forEach(([key, value]) => {
        if (key.startsWith('hx-') || key.startsWith('data-')) {
          if (value === undefined || value === null) {
            element.removeAttribute(key)
          } else {
            element.setAttribute(key, value)
          }
        }
      })

      // Trigger HTMX events programmatically
      if (props.htmxTrigger) {
        if (window.htmx) {
          window.htmx.trigger(element, props.htmxTrigger)
        }
      }

      // Refresh HTMX processing
      if (props.htmxRefresh) {
        if (window.htmx) {
          window.htmx.process(element)
        }
      }
    })

    // Setup HTMX event listeners when element mounts
    $effect(() => {
      if (!element) return

      // Clean up existing listeners
      htmxEventListenerCleanups.forEach(cleanup => cleanup())
      htmxEventListenerCleanups = []

      // Add listeners for all standard HTMX events
      const htmxEvents = [
        'htmx:beforeRequest',
        'htmx:afterRequest',
        'htmx:sendError',
        'htmx:responseError',
        'htmx:timeout',
        'htmx:abort',
        'htmx:beforeSwap',
        'htmx:afterSwap',
        'htmx:beforeSettle',
        'htmx:afterSettle',
        'htmx:beforeCleanupElement',
        'htmx:afterCleanupElement'
      ]

      htmxEvents.forEach(eventName => {
        const handler = (event) => emit(eventName, event)
        element.addEventListener(eventName, handler)
        htmxEventListenerCleanups.push(() => element.removeEventListener(eventName, handler))
      })

      // Cleanup on unmount
      return () => {
        htmxEventListenerCleanups.forEach(cleanup => cleanup())
      }
    })

    return {
      element,
      slots,
      passThroughProps
    }
  },

  // Svelte component template using native syntax
  template: `
    {#if $props.tag === 'a'}
      <a {...$passThroughProps} bind:this={element}>{#if $slots.default}{$slots.default()}{/if}</a>
    {:else if $props.tag === 'div'}
      <div {...$passThroughProps} bind:this={element}>{#if $slots.default}{$slots.default()}{/if}</div>
    {:else if $props.tag === 'form'}
      <form {...$passThroughProps} bind:this={element}>{#if $slots.default}{$slots.default()}{/if}</form>
    {:else if $props.tag === 'input'}
      <input {...$passThroughProps} bind:this={element} />
    {:else if $props.tag === 'select'}
      <select {...$passThroughProps} bind:this={element}>{#if $slots.default}{$slots.default()}{/if}</select>
    {:else if $props.tag === 'textarea'}
      <textarea {...$passThroughProps} bind:this={element}>{#if $slots.default}{$slots.default()}{/if}</textarea>
    {:else}
      <button {...$passThroughProps} bind:this={element}>{#if $slots.default}{$slots.default()}{/if}</button>
    {/if}
  `

  // Props are automatically bound to element attributes by Svelte
  // HTMX attributes will be applied in the setup $effect hook
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
    if (typeof window.htmx === 'undefined') {
      console.warn('htmx is not loaded')
      return false
    }
    return window.htmx.trigger(target, eventName, detail)
  }

  function process(target) {
    if (typeof window.htmx === 'undefined') {
      console.warn('htmx is not loaded')
      return
    }
    window.htmx.process(target)
  }

  function refresh(target) {
    process(target)
  }

  function ajax(options) {
    if (typeof window.htmx === 'undefined') {
      console.warn('htmx is not loaded')
      return Promise.reject(new Error('htmx is not loaded'))
    }

    return new Promise((resolve, reject) => {
      window.htmx.ajax(
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
    if (window.htmx) {
      window.htmx.takeClass(target, className)
    }
  }

  function giveClass(target, className) {
    if (window.htmx) {
      window.htmx.giveClass(target, className)
    }
  }

  function values(target) {
    if (window.htmx) {
      return window.htmx.values(target)
    }
    return {}
  }

  return {
    trigger,
    process,
    refresh,
    ajax,
    takeClass,
    giveClass,
    values,
    htmx: typeof window.htmx !== 'undefined' ? window.htmx : null
  }
}

/**
 * Svelte HTMX Plugin for auto-initialization
 */
export function HtmxPlugin() {
  return {
    name: 'htmx-plugin',
    install(app) {
      // Auto-process new elements when they're added to the DOM
      if (typeof window.htmx !== 'undefined') {
        window.htmx.config.useTemplateFragments = true
      }

      // Register Htmx component globally
      app.component('Htmx', Htmx)
    }
  }
}

/**
 * Svelte Action for HTMX
 *
 * Alternative usage with Svelte actions for more flexibility
 *
 * Usage:
 * <button use:htmx={{ 'hx-get': '/api/data', 'hx-target': '#result' }}>
 *   Load Data
 * </button>
 */
export function htmx(element, options) {
  const cleanupFunctions = []

  function updateOptions(newOptions) {
    // Remove existing attributes
    Object.keys(options || {}).forEach(key => {
      if (key.startsWith('hx-') || key.startsWith('data-')) {
        element.removeAttribute(key)
      }
    })

    // Update with new options
    options = newOptions || {}

    // Set HTMX attributes
    Object.entries(options).forEach(([key, value]) => {
      if (key.startsWith('hx-') || key.startsWith('data-')) {
        if (value === undefined || value === null) {
          element.removeAttribute(key)
        } else {
          element.setAttribute(key, value)
        }
      }
    })

    // Process element with HTMX
    if (window.htmx) {
      window.htmx.process(element)
    }
  }

  // Initial setup
  updateOptions(options)

  // Setup event listeners
  if (options.on) {
    Object.entries(options.on).forEach(([eventName, handler]) => {
      element.addEventListener(eventName, handler)
      cleanupFunctions.push(() => element.removeEventListener(eventName, handler))
    })
  }

  // Cleanup function
  function destroy() {
    cleanupFunctions.forEach(fn => fn())

    // Remove all HTMX attributes
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('hx-') || attr.name.startsWith('data-')) {
        element.removeAttribute(attr.name)
      }
    })
  }

  return {
    update: updateOptions,
    destroy
  }
}
