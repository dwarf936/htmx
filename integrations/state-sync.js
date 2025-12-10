/**
 * HTMX Framework State Sync
 * This module handles synchronization between framework state (React/Vue) and HTMX updates
 * to prevent state inconsistencies.
 */

const StateSync = (function() {
  const syncedElements = new WeakMap();
  const pendingUpdates = new Map();
  const updateQueue = [];
  let isProcessingQueue = false;

  // Configuration
  let config = {
    autoSync: true,
    debounceMs: 10,
    debug: false
  };

  function log(message, ...args) {
    if (config.debug) {
      console.log(`[HTMX State Sync] ${message}`, ...args);
    }
  }

  // Debounce function for handling rapid updates
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Queue update to prevent race conditions
  function queueUpdate(element, updateFn) {
    const elementKey = element instanceof Element ? element : element.key;
    
    if (pendingUpdates.has(elementKey)) {
      clearTimeout(pendingUpdates.get(elementKey));
    }

    const timeoutId = setTimeout(() => {
      updateQueue.push({ element, updateFn });
      if (!isProcessingQueue) {
        processUpdateQueue();
      }
      pendingUpdates.delete(elementKey);
    }, config.debounceMs);

    pendingUpdates.set(elementKey, timeoutId);
  }

  function processUpdateQueue() {
    isProcessingQueue = true;
    
    while (updateQueue.length > 0) {
      const update = updateQueue.shift();
      try {
        update.updateFn();
        log('Processed update for element', update.element);
      } catch (error) {
        console.error('Error processing state update:', error);
      }
    }
    
    isProcessingQueue = false;
  }

  // Sync HTMX updates to framework state
  function syncHtmxToFramework(element, frameworkUpdater) {
    if (!syncedElements.has(element)) {
      // Setup event listeners for HTMX events
      const eventListener = function(evt) {
        if (evt.detail && evt.detail.target === element || evt.target === element) {
          queueUpdate(element, () => {
            frameworkUpdater(element);
          });
        }
      };

      element.addEventListener('htmx:afterSwap', eventListener);
      element.addEventListener('htmx:afterRequest', eventListener);
      element.addEventListener('htmx:wsAfterMessage', eventListener);

      syncedElements.set(element, {
        frameworkUpdater,
        eventListener
      });

      log('Registered state sync for element', element);
    }
  }

  // Sync framework state to HTMX attributes
  function syncFrameworkToHtmx(element, props) {
    queueUpdate(element, () => {
      if (!element || !element.parentNode) {
        unsyncElement(element);
        return;
      }

      // Update HTMX attributes from framework props
      Object.entries(props).forEach(([key, value]) => {
        if (key.startsWith('hx') || key.startsWith('data-hx')) {
          const attrKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          if (element.getAttribute(attrKey) !== String(value)) {
            element.setAttribute(attrKey, value);
          }
        }
      });

      // Re-process element with HTMX if needed
      if (window.htmx) {
        window.htmx.process(element);
      }
    });
  }

  // Remove sync for element
  function unsyncElement(element) {
    if (syncedElements.has(element)) {
      const syncData = syncedElements.get(element);
      element.removeEventListener('htmx:afterSwap', syncData.eventListener);
      element.removeEventListener('htmx:afterRequest', syncData.eventListener);
      element.removeEventListener('htmx:wsAfterMessage', syncData.eventListener);
      syncedElements.delete(element);
      log('Unregistered state sync for element', element);
    }

    if (pendingUpdates.has(element)) {
      clearTimeout(pendingUpdates.get(element));
      pendingUpdates.delete(element);
    }
  }

  // Event bridge to convert HTMX events to framework events
  function setupEventBridge(frameworkEmit) {
    const eventBridge = function(evt) {
      if (evt.type.startsWith('htmx:')) {
        const frameworkEventName = evt.type.replace('htmx:', 'htmx-');
        frameworkEmit(frameworkEventName, {
          originalEvent: evt,
          detail: evt.detail
        });
      }
    };

    document.addEventListener('htmx:beforeRequest', eventBridge);
    document.addEventListener('htmx:afterRequest', eventBridge);
    document.addEventListener('htmx:afterSwap', eventBridge);
    document.addEventListener('htmx:error', eventBridge);
    document.addEventListener('htmx:wsOpen', eventBridge);
    document.addEventListener('htmx:wsClose', eventBridge);

    return function cleanup() {
      document.removeEventListener('htmx:beforeRequest', eventBridge);
      document.removeEventListener('htmx:afterRequest', eventBridge);
      document.removeEventListener('htmx:afterSwap', eventBridge);
      document.removeEventListener('htmx:error', eventBridge);
      document.removeEventListener('htmx:wsOpen', eventBridge);
      document.removeEventListener('htmx:wsClose', eventBridge);
    };
  }

  // Bulk sync for multiple elements
  function bulkSync(elementsWithUpdaters) {
    elementsWithUpdaters.forEach(({ element, updater }) => {
      syncHtmxToFramework(element, updater);
    });
  }

  // Initialize state sync
  function init(options = {}) {
    config = { ...config, ...options };
    log('State sync initialized with config', config);

    // Auto-sync mode: automatically track HTMX updates
    if (config.autoSync) {
      document.addEventListener('htmx:afterSwap', (evt) => {
        if (evt.target && evt.target.getAttribute('data-sync')) {
          const syncKey = evt.target.getAttribute('data-sync');
          const syncEvent = new CustomEvent('htmx-sync-update', {
            detail: {
              key: syncKey,
              element: evt.target,
              content: evt.target.innerHTML
            },
            bubbles: true
          });
          document.dispatchEvent(syncEvent);
        }
      });
    }
  }

  // Public API
  return {
    init,
    syncHtmxToFramework,
    syncFrameworkToHtmx,
    unsyncElement,
    setupEventBridge,
    bulkSync,
    queueUpdate,
    config
  };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateSync;
} else if (typeof window !== 'undefined') {
  window.HTMXStateSync = StateSync;
}