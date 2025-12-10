// Vue 2/Vue 3 兼容的HTMX自定义指令
const HtmxDirective = {
  // Vue 3 语法
  mounted(el, binding, vnode) {
    this.initHtmx(el, binding, vnode)
  },

  // Vue 2 语法
  inserted(el, binding, vnode) {
    this.initHtmx(el, binding, vnode)
  },

  updated(el, binding, vnode, oldVnode) {
    // 当指令参数或值变化时更新HTMX属性
    if (binding.value !== binding.oldValue || binding.arg !== binding.oldArg) {
      this.updateHtmxAttributes(el, binding)
    }
  },

  unmounted(el) {
    this.cleanupHtmx(el)
  },

  destroyed(el) {
    this.cleanupHtmx(el)
  },

  methods: {
    /**
     * 初始化HTMX指令
     */
    initHtmx(el, binding, vnode) {
      // 初始化HTMX属性
      this.updateHtmxAttributes(el, binding)

      // 注册事件监听器
      this.registerEventListeners(el, binding, vnode)

      // 处理Vue状态与HTMX同步
      this.setupStateSync(el, binding, vnode)

      // 初始化HTMX
      if (window.htmx) {
        window.htmx.process(el)
      }
    },

    /**
     * 更新HTMX属性
     */
    updateHtmxAttributes(el, binding) {
      // 清除旧的HTMX属性
      Object.keys(el.attributes).forEach(attr => {
        if (attr.startsWith('hx-')) {
          el.removeAttribute(attr)
        }
      })

      // 设置新的HTMX属性
      if (binding.arg) {
        // 单个属性模式: v-htmx:get="/api/data"
        el.setAttribute(`hx-${binding.arg}`, binding.value)
      } else if (typeof binding.value === 'object') {
        // 对象模式: v-htmx="{ get: '/api/data', swap: 'outerHTML' }"
        Object.entries(binding.value).forEach(([key, value]) => {
          if (key === 'on') {
            // 事件处理单独处理
            return
          }
          const attributeKey = key.startsWith('hx-') ? key : `hx-${key}`
          el.setAttribute(attributeKey, value)
        })
      }
    },

    /**
     * 注册HTMX事件监听器
     */
    registerEventListeners(el, binding, vnode) {
      // 清除旧的事件监听器
      if (el._htmxEventListeners) {
        el._htmxEventListeners.forEach((handler, eventName) => {
          el.removeEventListener(eventName, handler)
        })
        el._htmxEventListeners = null
      }

      const listeners = {}

      // 处理事件绑定
      if (binding.value?.on && typeof binding.value.on === 'object') {
        Object.entries(binding.value.on).forEach(([eventName, handler]) => {
          const htmxEventName = eventName.startsWith('htmx:') ? eventName : `htmx:${eventName}`

          const eventHandler = (event) => {
            if (typeof handler === 'function') {
              handler.call(vnode.context, event)
            }
          }

          el.addEventListener(htmxEventName, eventHandler)
          listeners[htmxEventName] = eventHandler
        })
      }

      el._htmxEventListeners = listeners
    },

    /**
     * 设置Vue状态与HTMX同步
     */
    setupStateSync(el, binding, vnode) {
      // 监听HTMX更新事件，同步到Vue状态
      const handleAfterSwap = (event) => {
        if (binding.value?.onAfterUpdate) {
          binding.value.onAfterUpdate.call(vnode.context, event.detail)
        }

        // 自动同步表单值到Vue状态
        if (el.tagName === 'FORM' && vnode.context && binding.value?.sync) {
          const formData = new FormData(el)
          const data = Object.fromEntries(formData.entries())
          Object.assign(vnode.context[binding.value.sync], data)
        }
      }

      el.addEventListener('htmx:afterSwap', handleAfterSwap)

      if (!el._htmxCleanupListeners) {
        el._htmxCleanupListeners = []
      }
      el._htmxCleanupListeners.push(() => {
        el.removeEventListener('htmx:afterSwap', handleAfterSwap)
      })
    },

    /**
     * 清理HTMX相关资源
     */
    cleanupHtmx(el) {
      // 移除事件监听器
      if (el._htmxEventListeners) {
        Object.entries(el._htmxEventListeners).forEach(([eventName, handler]) => {
          el.removeEventListener(eventName, handler)
        })
        el._htmxEventListeners = null
      }

      // 移除清理监听器
      if (el._htmxCleanupListeners) {
        el._htmxCleanupListeners.forEach(cleanup => cleanup())
        el._htmxCleanupListeners = null
      }

      // 取消正在进行的HTMX请求
      if (window.htmx) {
        window.htmx.abort(el)
      }
    }
  }
}

// Vue插件安装函数
const HtmxPlugin = {
  install(app) {
    // 注册v-htmx指令
    app.directive('htmx', HtmxDirective)

    // 提供全局HTMX实例
    app.config.globalProperties.$htmx = window.htmx

    // 注册全局组件
    app.component('HtmxElement', {
      props: {
        tag: {
          type: String,
          default: 'div'
        },
        hx: Object
      },
      render() {
        return this.$createElement(this.tag, this.$attrs, this.$slots.default)
      },
      mounted() {
        if (this.hx && window.htmx) {
          Object.entries(this.hx).forEach(([key, value]) => {
            const attributeKey = key.startsWith('hx-') ? key : `hx-${key}`
            this.$el.setAttribute(attributeKey, value)
          })
          window.htmx.process(this.$el)
        }
      }
    })
  }
}

// Vue 2 兼容导出
if (window.Vue) {
  window.Vue.directive('htmx', HtmxDirective)
}

export default HtmxPlugin
export { HtmxDirective }
