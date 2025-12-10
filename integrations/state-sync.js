// 注册提前的React同步策略，将被附加到正式导出类实例

/**
 * HTMX 状态同步与事件桥接模块
 * 用于在现代前端框架与HTMX之间保持状态同步和事件互通
 */

/**
 * 状态同步核心类
 */
export class HtmxStateSync {
  constructor(options = {}) {
    this.stores = new Map()
    this.listeners = new Map()
    this.debug = options.debug || false
  }

  /**
   * 注册状态商店
   * @param {string} name - 商店名称
   * @param {Object} store - 状态商店对象，需要包含subscribe和set方法
   */
  registerStore(name, store) {
    if (!store || typeof store.subscribe !== 'function' || typeof store.set !== 'function') {
      throw new Error('Store must implement subscribe and set methods')
    }

    this.stores.set(name, store)
    this.log(`Registered store: ${name}`)

    // 监听商店变化并同步到HTMX
    const unsubscribe = store.subscribe((state) => {
      this.syncToHtmx(name, state)
    })

    // 保存 unsubscribe 函数以便清理
    this.listeners.set(name, unsubscribe)

    return () => {
      this.unregisterStore(name)
    }
  }

  /**
   * 注销状态商店
   * @param {string} name - 商店名称
   */
  unregisterStore(name) {
    const unsubscribe = this.listeners.get(name)
    if (unsubscribe) {
      unsubscribe()
      this.listeners.delete(name)
    }
    this.stores.delete(name)
    this.log(`Unregistered store: ${name}`)
  }

  /**
   * 将状态同步到HTMX
   * @param {string} storeName - 商店名称
   * @param {Object} state - 状态数据
   */
  syncToHtmx(storeName, state) {
    if (!window.htmx) return

    // 将状态同步到所有带有 [data-sync="storeName"] 属性的元素
    document.querySelectorAll(`[data-sync="${storeName}"]`).forEach(node => {
      // 更新元素值
      Object.entries(state).forEach(([key, value]) => {
        const field = node.querySelector(`[name="${key}"]`) || node.querySelector(`[data-field="${key}"]`)
        if (field) {
          if (field.type === 'checkbox') {
            field.checked = value
          } else {
            field.value = value
          }

          // 触发输入事件以通知HTMX
          field.dispatchEvent(new Event('input', { bubbles: true }))
        }
      })

      // 使用HTMX values API设置请求参数
      window.htmx.values(node, state)
    })

    this.log(`Synced state to HTMX: ${storeName}`, state)
  }

  /**
   * 将HTMX更新同步到状态商店
   * @param {string} storeName - 商店名称
   * @param {Object} data - 从HTMX获取的数据
   */
  syncFromHtmx(storeName, data) {
    const store = this.stores.get(storeName)
    if (!store) return

    store.set(data)
    this.log(`Synced state from HTMX: ${storeName}`, data)
  }

  /**
   * 自动同步HTMX表单提交
   * @param {string} storeName - 商店名称
   * @param {string} formSelector - 表单选择器
   */
  autoSyncForm(storeName, formSelector) {
    const form = document.querySelector(formSelector)
    if (!form) return

    const handleSubmit = (event) => {
      if (event.detail && event.detail.requestConfig) {
        const store = this.stores.get(storeName)
        if (store) {
          // 将当前状态添加到请求参数
          event.detail.requestConfig.parameters = {
            ...event.detail.requestConfig.parameters,
            ...store.getState?.() || {}
          }
        }
      }
    }

    const handleAfterSwap = (event) => {
      if (event.detail && event.detail.xhr) {
        try {
          const response = JSON.parse(event.detail.xhr.responseText)
          this.syncFromHtmx(storeName, response)
        } catch (e) {
          // 非JSON响应，忽略
        }
      }
    }

    form.addEventListener('htmx:configRequest', handleSubmit)
    form.addEventListener('htmx:afterSwap', handleAfterSwap)

    this.log(`Enabled auto-sync for form: ${formSelector} to store: ${storeName}`)

    return () => {
      form.removeEventListener('htmx:configRequest', handleSubmit)
      form.removeEventListener('htmx:afterSwap', handleAfterSwap)
    }
  }

  /**
   * 日志方法
   */
  log(...args) {
    if (this.debug) {
      console.log('[HTMX State Sync]', ...args)
    }
  }

  /**
   * 清除所有注册的商店和监听器
   */
  clear() {
    this.listeners.forEach(unsubscribe => unsubscribe())
    this.stores.clear()
    this.listeners.clear()
  }
}

/**
 * HTMX 事件桥接器
 * 将HTMX事件转换为框架原生事件
 */
export class HtmxEventBridge {
  constructor(options = {}) {
    this.framework = options.framework
    this.debug = options.debug || false
    this.eventMap = new Map()
    this.listeners = new Map()
    this.init()
  }

  init() {
    this.setupEventMap()
    this.setupEventListeners()
  }

  /**
   * 设置事件映射
   */
  setupEventMap() {
    // 将HTMX事件映射为框架风格的事件名称
    this.eventMap.set('htmx:beforeRequest', 'beforeRequest')
    this.eventMap.set('htmx:afterRequest', 'afterRequest')
    this.eventMap.set('htmx:afterSwap', 'afterSwap')
    this.eventMap.set('htmx:afterSettle', 'afterSettle')
    this.eventMap.set('htmx:responseError', 'responseError')
    this.eventMap.set('htmx:sendError', 'sendError')
    this.eventMap.set('htmx:validation:failed', 'validationFailed')
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    this.eventMap.forEach((frameworkEventName, htmxEventName) => {
      document.addEventListener(htmxEventName, (event) => {
        this.dispatchFrameworkEvent(event.target, frameworkEventName, event.detail)
      })
    })
  }

  /**
   * 调度框架原生事件
   */
  dispatchFrameworkEvent(element, eventName, detail) {
    switch (this.framework) {
      case 'react':
        this.dispatchReactEvent(element, eventName, detail)
        break
      case 'vue':
        this.dispatchVueEvent(element, eventName, detail)
        break
      case 'svelte':
        this.dispatchSvelteEvent(element, eventName, detail)
        break
      default:
        this.dispatchCustomEvent(element, eventName, detail)
    }
  }

  /**
   * 调度React事件
   */
  dispatchReactEvent(element, eventName, detail) {
    const reactEventName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`

    // React使用合成事件，我们需要模拟这个机制
    const event = new CustomEvent(reactEventName, { detail, bubbles: true, cancelable: true })
    element.dispatchEvent(event)
  }

  /**
   * 调度Vue事件
   */
  dispatchVueEvent(element, eventName, detail) {
    // Vue使用$emit触发事件
    if (element.__vue__) {
      element.__vue__.$emit(eventName, detail)
    } else {
      const event = new CustomEvent(`update:${eventName}`, { detail, bubbles: true })
      element.dispatchEvent(event)
    }
  }

  /**
   * 调度Svelte事件
   */
  dispatchSvelteEvent(element, eventName, detail) {
    const event = new CustomEvent(eventName, { detail, bubbles: true })
    element.dispatchEvent(event)
  }

  /**
   * 调度自定义事件
   */
  dispatchCustomEvent(element, eventName, detail) {
    const event = new CustomEvent(eventName, { detail, bubbles: true, cancelable: true })
    element.dispatchEvent(event)
  }

  /**
   * 注册自定义事件映射
   */
  registerEventMapping(htmxEventName, frameworkEventName) {
    this.eventMap.set(htmxEventName, frameworkEventName)
  }

  /**
   * 将HTMX事件转换为框架事件
   * @param {HTMLElement} node - 监听的DOM节点
   * @param {string[]} events - 要转换的事件列表
   */
  bridgeEvents(node, events) {
    const eventHandlers = []

    events.forEach(eventName => {
      const handler = (event) => {
        const frameworkEventName = this.eventMap.get(eventName) || eventName.replace('htmx:', '')

        // 创建自定义事件
        const frameworkEvent = new CustomEvent(frameworkEventName, {
          detail: event.detail,
          bubbles: true,
          cancelable: true
        })

        // 触发框架事件
        node.dispatchEvent(frameworkEvent)
        this.log(`Bridged event: ${eventName} → ${frameworkEventName}`)
      }

      const htmxEventName = eventName.startsWith('htmx:') ? eventName : `htmx:${eventName}`
      node.addEventListener(htmxEventName, handler)
      eventHandlers.push({ eventName: htmxEventName, handler })
    })

    // 保存处理程序以便清理
    const key = Symbol('event-bridge')
    if (!this.listeners) this.listeners = new Map()
    this.listeners.set(key, eventHandlers)

    return () => {
      this.unbridgeEvents(key)
    }
  }

  /**
   * 将框架事件转换为HTMX事件
   * @param {HTMLElement} node - 监听的DOM节点
   * @param {string[]} events - 要转换的事件列表
   */
  reverseBridgeEvents(node, events) {
    const eventHandlers = []

    events.forEach(eventName => {
      const handler = (event) => {
        const htmxEventName = `htmx:${eventName}`

        // 触发HTMX事件
        if (window.htmx) {
          window.htmx.trigger(node, htmxEventName, event.detail)
          this.log(`Reverse bridged event: ${eventName} → ${htmxEventName}`)
        }
      }

      node.addEventListener(eventName, handler)
      eventHandlers.push({ eventName, handler })
    })

    // 保存处理程序以便清理
    const key = Symbol('reverse-event-bridge')
    if (!this.listeners) this.listeners = new Map()
    this.listeners.set(key, eventHandlers)

    return () => {
      this.unbridgeEvents(key)
    }
  }

  /**
   * 注销事件桥接
   */
  unbridgeEvents(key) {
    const eventHandlers = this.listeners?.get(key)
    if (eventHandlers) {
      eventHandlers.forEach(({ eventName, handler }) => {
        document.removeEventListener(eventName, handler)
      })
      this.listeners.delete(key)
    }
  }

  /**
   * 自动桥接所有HTMX事件
   */
  autoBridgeAll() {
    const allHtmxEvents = [
      'htmx:abort', 'htmx:afterRequest', 'htmx:afterSettle', 'htmx:afterSwap', 'htmx:afterValidate',
      'htmx:beforeRequest', 'htmx:beforeSwap', 'htmx:beforeValidate', 'htmx:configRequest',
      'htmx:confirm', 'htmx:historyCacheError', 'htmx:historyCacheMiss', 'htmx:historyCacheMissError',
      'htmx:historyCacheSuccess', 'htmx:historyRestore', 'htmx:prompt', 'htmx:responseError',
      'htmx:sendError', 'htmx:sseError', 'htmx:swapError', 'htmx:timeout', 'htmx:validation:failed',
      'htmx:validation:halted', 'htmx:validation:success', 'htmx:wsConnectError', 'htmx:wsError'
    ]

    return this.bridgeEvents(document, allHtmxEvents)
  }

  /**
   * 日志方法
   */
  log(...args) {
    if (this.debug) {
      console.log('[HtmxEventBridge]', ...args)
    }
  }
}

// 创建单例实例
const htmxStateSync = new HtmxStateSync()
const htmxEventBridge = new HtmxEventBridge()

// 注册默认同步策略
htmxStateSync.registerSyncStrategy = function(name, strategy) {
  // 兼容旧版API
  console.warn('registerSyncStrategy is deprecated, use registerStore instead')
}

// 注册React默认同步策略
htmxStateSync.registerStore('react', {
  subscribe: (callback) => {
    // 空实现，用于兼容
    return () => {}
  },
  set: (state) => {
    // 尝试更新所有React组件
    document.querySelectorAll('[data-reactroot]').forEach(element => {
      if (element._reactInternals && element._reactInternals.setState) {
        element._reactInternals.setState(state)
      }
    })
  }
})

// 注册Vue默认同步策略
htmxStateSync.registerStore('vue', {
  subscribe: (callback) => {
    return () => {}
  },
  set: (state) => {
    document.querySelectorAll('[data-v-app], [data-v-scope]').forEach(element => {
      if (element.__vue__) {
        Object.assign(element.__vue__.$data, state)
      }
    })
  }
})

// 注册Svelte默认同步策略
htmxStateSync.registerStore('svelte', {
  subscribe: (callback) => {
    return () => {}
  },
  set: (state) => {
    document.querySelectorAll('[data-svelte]').forEach(element => {
      if (element.$$ && element.$$.set) {
        element.$$.set(state)
      }
    })
  }
})

// 全局注册
if (typeof window !== 'undefined') {
  window.htmxStateSync = htmxStateSync
  window.htmxEventBridge = htmxEventBridge
  window.HtmxStateSync = HtmxStateSync
  window.HtmxEventBridge = HtmxEventBridge
}

// ES模块导出
export { htmxStateSync, htmxEventBridge }
export default htmxStateSync
