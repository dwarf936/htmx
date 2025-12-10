/**
 * 事件监听器管理工具类
 * 解决事件监听器注册性能问题，支持增量更新、防抖处理和健壮的清理机制
 */
export class EventManager {
  constructor(target) {
    this.target = target // 事件目标元素
    this.listeners = new Map() // 存储已注册的事件监听器
    this.debounceTimers = new Map() // 存储防抖计时器
    this.isDestroyed = false // 是否已销毁
  }

  /**
   * 注册事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 事件处理函数
   * @param {Object} options - 选项，包括防抖时间等
   */
  on(eventName, handler, options = {}) {
    if (this.isDestroyed) return

    // 如果已存在相同的事件监听器，先移除旧的
    if (this.listeners.has(eventName)) {
      this.off(eventName)
    }

    let eventHandler = handler

    // 添加防抖处理
    if (options.debounce) {
      eventHandler = this.debounce(handler, options.debounce)
    }

    // 注册事件监听器
    this.target.addEventListener(eventName, eventHandler, options)
    this.listeners.set(eventName, { handler: eventHandler, originalHandler: handler, options })
  }

  /**
   * 批量注册事件监听器
   * @param {Object} eventMap - 事件映射对象
   * @param {Object} defaultOptions - 默认选项
   */
  addEvents(eventMap, defaultOptions = {}) {
    if (this.isDestroyed) return

    Object.entries(eventMap).forEach(([eventName, handler]) => {
      if (typeof handler === 'function') {
        this.on(eventName, handler, defaultOptions)
      }
    })
  }

  /**
   * 移除事件监听器
   * @param {string} eventName - 事件名称
   */
  off(eventName) {
    if (this.isDestroyed) return

    const listener = this.listeners.get(eventName)
    if (listener) {
      this.target.removeEventListener(eventName, listener.handler, listener.options)
      this.listeners.delete(eventName)

      // 清除防抖计时器
      if (this.debounceTimers.has(eventName)) {
        clearTimeout(this.debounceTimers.get(eventName))
        this.debounceTimers.delete(eventName)
      }
    }
  }

  /**
   * 批量移除事件监听器
   * @param {Array<string>} eventNames - 事件名称数组
   */
  removeEvents(eventNames) {
    if (this.isDestroyed) return

    eventNames.forEach(eventName => this.off(eventName))
  }

  /**
   * 更新事件监听器
   * 增量更新，只添加新的监听器和移除不再需要的监听器
   * @param {Object} newEventMap - 新的事件映射对象
   * @param {Object} defaultOptions - 默认选项
   */
  updateEvents(newEventMap, defaultOptions = {}) {
    if (this.isDestroyed) return

    // 找出需要移除的事件
    const eventsToRemove = Array.from(this.listeners.keys())
      .filter(eventName => !(eventName in newEventMap))

    // 移除不再需要的事件
    this.removeEvents(eventsToRemove)

    // 添加新的或更新的事件
    Object.entries(newEventMap).forEach(([eventName, newHandler]) => {
      const existingListener = this.listeners.get(eventName)

      // 如果事件不存在或者处理函数发生变化，则更新
      if (!existingListener || existingListener.originalHandler !== newHandler) {
        this.on(eventName, newHandler, defaultOptions)
      }
    })
  }

  /**
   * 防抖函数
   * @param {Function} func - 要防抖的函数
   * @param {number} wait - 防抖时间，单位毫秒
   * @returns {Function} 防抖后的函数
   */
  debounce(func, wait) {
    let timeout

    return (...args) => {
      const later = () => {
        timeout = null
        func.apply(this, args)
      }

      if (this.debounceTimers.has(func)) {
        clearTimeout(this.debounceTimers.get(func))
      }

      timeout = setTimeout(later, wait)
      this.debounceTimers.set(func, timeout)
    }
  }

  /**
   * 清理所有事件监听器
   */
  clear() {
    if (this.isDestroyed) return

    // 移除所有事件监听器
    Array.from(this.listeners.keys()).forEach(eventName => this.off(eventName))
    this.listeners.clear()

    // 清除所有防抖计时器
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
  }

  /**
   * 销毁事件管理器
   */
  destroy() {
    if (this.isDestroyed) return

    this.clear()
    this.target = null
    this.isDestroyed = true
  }

  /**
   * 获取已注册的事件监听器数量
   * @returns {number} 事件监听器数量
   */
  getListenerCount() {
    return this.listeners.size
  }
}

/**
 * 创建事件管理器实例
 * @param {EventTarget} target - 事件目标元素
 * @returns {EventManager} 事件管理器实例
 */
export function createEventManager(target) {
  return new EventManager(target)
}
