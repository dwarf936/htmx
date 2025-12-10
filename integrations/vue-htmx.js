// Vue 3 HTMX Plugin
export default {
  install(app) {
    // Global config
    let globalConfig = {};

    // v-htmx directive
    app.directive('htmx', {
      mounted(el, binding) {
        if (!window.htmx) {
          console.error('HTMX is not loaded globally. Please include HTMX before this plugin.');
          return;
        }

        updateHtmxAttributes(el, binding);
        setupEventListeners(el, binding);
        window.htmx.process(el);
      },

      updated(el, binding) {
        if (binding.value === binding.oldValue) return;
        
        // Clean up old attributes and listeners
        cleanupHtmxAttributes(el, binding.oldValue);
        cleanupEventListeners(el, binding.oldValue);
        
        // Update with new values
        updateHtmxAttributes(el, binding);
        setupEventListeners(el, binding);
        window.htmx.process(el);
      },

      unmounted(el, binding) {
        cleanupHtmxAttributes(el, binding.value);
        cleanupEventListeners(el, binding.value);
        window.htmx._('cleanupElement')(el);
      }
    });

    // Provide global access to HTMX API
    app.provide('htmx', window.htmx);

    // Global config method
    app.config.globalProperties.$htmxConfig = function(config) {
      globalConfig = { ...globalConfig, ...config };
    };

    // Global HTMX API methods
    app.config.globalProperties.$htmx = {
      trigger: (el, eventName, detail) => window.htmx?.trigger(el, eventName, detail),
      ajax: (options) => window.htmx?.ajax(options),
      process: (el) => window.htmx?.process(el),
      values: (el) => window.htmx?.values(el)
    };
  }
};

// Helper function to convert Vue props to HTMX attributes
function convertToHtmxAttribute(key, value) {
  if (key.startsWith('on')) {
    return null;
  }
  
  // Convert camelCase to kebab-case
  let attrKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
  
  // Prefix with hx- if not already prefixed
  if (!attrKey.startsWith('hx-') && !attrKey.startsWith('data-')) {
    attrKey = `hx-${attrKey}`;
  }
  
  return { key: attrKey, value };
}

function updateHtmxAttributes(el, binding) {
  const value = binding.value || {};
  
  Object.entries(value).forEach(([key, val]) => {
    if (key.startsWith('on')) {
      return;
    }
    
    const attr = convertToHtmxAttribute(key, val);
    if (attr) {
      el.setAttribute(attr.key, attr.value);
    }
  });
}

function cleanupHtmxAttributes(el, oldValue) {
  if (!oldValue) return;
  
  Object.entries(oldValue).forEach(([key]) => {
    if (key.startsWith('on')) {
      return;
    }
    
    const attrKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    const finalAttrKey = attrKey.startsWith('hx-') ? attrKey : `hx-${attrKey}`;
    el.removeAttribute(finalAttrKey);
  });
}

function setupEventListeners(el, binding) {
  const value = binding.value || {};
  
  // Store listeners on element for cleanup
  if (!el._htmxListeners) {
    el._htmxListeners = {};
  }

  Object.entries(value).forEach(([key, handler]) => {
    if (key.startsWith('on')) {
      const eventName = key.replace(/^on/, '').replace(/([A-Z])/, '-$1').toLowerCase();
      const htmxEventName = eventName.startsWith('htmx:') ? eventName : `htmx:${eventName}`;
      
      el._htmxListeners[htmxEventName] = handler;
      el.addEventListener(htmxEventName, handler);
    }
  });
}

function cleanupEventListeners(el, oldValue) {
  if (!el._htmxListeners) return;
  
  Object.entries(el._htmxListeners).forEach(([event, handler]) => {
    el.removeEventListener(event, handler);
  });
  
  delete el._htmxListeners;
}

// Composition API helper
export function useHtmx() {
  const inject = typeof window !== 'undefined' && window.Vue?.inject;
  const htmx = inject?.('htmx') || window.htmx;
  
  return {
    htmx,
    trigger: (el, eventName, detail) => htmx?.trigger(el, eventName, detail),
    ajax: (options) => htmx?.ajax(options),
    process: (el) => htmx?.process(el)
  };
}