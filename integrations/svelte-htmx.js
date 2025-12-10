import { onMount, onDestroy, beforeUpdate } from 'svelte'
import { createEventManager } from './event-manager.js'

/**
 * Svelte HTMX 动作
 * 用于在Svelte组件中集成HTMX功能
 * @param {HTMLElement} node - 要绑定HTMX的DOM节点
 * @param {Object} options - HTMX配置选项
 * @returns {Object} 动作API
 */
export function htmx(node, options = {}) {
  let eventManager = null
  let currentOptions = options

  /**
   * 更新HTMX属性
   */
  function updateAttributes(newOptions) {
    // 清除旧的HTMX属性
    Array.from(node.attributes).forEach(attr => {
      if (attr.name.startsWith('hx-')) {
        node.removeAttribute(attr.name)
      }
    })

    // 设置新的HTMX属性
    Object.entries(newOptions).forEach(([key, value]) => {
      if (key === 'on') return

      const attributeKey = key.startsWith('hx-') ? key : `hx-${key}`

      if (value !== undefined && value !== null) {
        node.setAttribute(attributeKey, value)
      }
    })

    // 重新处理HTMX
    if (window.htmx) {
      window.htmx.process(node)
    }
  }

  /**
   * 更新事件监听器
   */
  function updateEventListeners(newOptions) {
    if (!eventManager) {
      eventManager = createEventManager(node)
    }

    // 创建事件映射
    const eventMap = {}
    if (newOptions.on && typeof newOptions.on === 'object') {
      Object.entries(newOptions.on).forEach(([eventName, handler]) => {
        const htmxEventName = eventName.startsWith('htmx:') ? eventName : `htmx:${eventName}`
        eventMap[htmxEventName] = (event) => {
          if (typeof handler === 'function') {
            handler(event)
          }
        }
      })
    }

    // 增量更新事件监听器，添加防抖处理
    eventManager.updateEvents(eventMap, { debounce: 10 })
  }

  /**
   * 设置状态同步
   */
  function setupStateSync(newOptions) {
    if (newOptions.sync) {
      const handleAfterSwap = (event) => {
        if (typeof newOptions.sync === 'function') {
          newOptions.sync(event.detail)
        }
      }

      node.addEventListener('htmx:afterSwap', handleAfterSwap)
      eventListeners['htmx:afterSwap'] = handleAfterSwap
    }
  }

  // 初始化
  onMount(() => {
    updateAttributes(currentOptions)
    updateEventListeners(currentOptions)
    setupStateSync(currentOptions)
  })

  // 清理
  onDestroy(() => {
    if (eventManager) {
      eventManager.destroy()
      eventManager = null
    }

    if (window.htmx) {
      window.htmx.abort(node)
    }
  })

  return {
    /**
     * 更新HTMX配置
     */
    update(newOptions) {
      currentOptions = newOptions
      updateAttributes(currentOptions)
      updateEventListeners(currentOptions)
      setupStateSync(currentOptions)
    },

    /**
     * 手动触发HTMX请求
     */
    trigger(eventName) {
      if (window.htmx) {
        window.htmx.trigger(node, eventName)
      }
    },

    /**
     * 中止当前HTMX请求
     */
    abort() {
      if (window.htmx) {
        window.htmx.abort(node)
      }
    },

    /**
     * 重新处理HTMX
     */
    process() {
      if (window.htmx) {
        window.htmx.process(node)
      }
    }
  }
}

/**
 * Svelte HTMX 组件
 * 提供声明式的HTMX组件
 */
export class HtmxElement extends HTMLElement {
  static observedAttributes = [...Array.from({ length: 50 }, (_, i) => `hx-${String.fromCharCode(97 + i)}`)]

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.render()
    if (window.htmx) {
      window.htmx.process(this)
    }
  }

  attributeChangedCallback() {
    this.render()
  }

  render() {
    const tag = this.getAttribute('tag') || 'div'
    const element = document.createElement(tag)

    // 复制所有属性
    Array.from(this.attributes).forEach(attr => {
      if (attr.name !== 'tag') {
        element.setAttribute(attr.name, attr.value)
      }
    })

    // 复制子节点
    while (this.firstChild) {
      element.appendChild(this.firstChild)
    }

    this.shadowRoot.innerHTML = ''
    this.shadowRoot.appendChild(element)
  }
}

// 自定义元素注册
if (customElements.get('htmx-element') === undefined) {
  customElements.define('htmx-element', HtmxElement)
}

/**
 * 用于Svelte商店的HTMX状态同步工具
 */
export function syncStoreWithHtmx(store, nodeSelector) {
  let unsubscribe

  onMount(() => {
    unsubscribe = store.subscribe((state) => {
      const node = document.querySelector(nodeSelector)
      if (node && window.htmx) {
        // 将商店状态同步到HTMX请求参数
        window.htmx.values(node, state)
      }
    })

    const node = document.querySelector(nodeSelector)
    if (node) {
      // 使用事件管理器注册事件监听器
      const eventManager = createEventManager(node)

      // 监听HTMX响应并同步到商店
      const handleAfterSwap = (event) => {
        if (event.detail && event.detail.xhr) {
          const response = event.detail.xhr.responseText
          try {
            const data = JSON.parse(response)
            store.set(data)
          } catch (e) {
            // 非JSON响应，忽略
          }
        }
      }

      eventManager.on('htmx:afterSwap', handleAfterSwap, { debounce: 0 })

      onDestroy(() => {
        eventManager.destroy()
      })
    }
  })

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })
}
