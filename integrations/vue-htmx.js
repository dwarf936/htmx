import { defineComponent, h, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { createEventManager } from './event-manager.js'

// 预定义HTMX属性
const htmxProps = {
  hxGet: String,
  hxPost: String,
  hxPut: String,
  hxPatch: String,
  hxDelete: String,
  hxSwap: String,
  hxTarget: String,
  hxTrigger: String,
  hxBoost: [Boolean, String],
  hxSelect: String,
  hxSelectOob: String,
  hxConfirm: String,
  hxIndicator: String,
  hxParams: String,
  hxPushUrl: [Boolean, String],
  hxReplaceUrl: [Boolean, String],
  hxSync: String,
  hxHistory: String,
  hxHistoryElt: Boolean,
  hxDisable: Boolean,
  hxEncoding: String,
  hxHeaders: Object,
  hxInclude: String,
  hxVars: [String, Object],
  hxWs: String
}

// 预定义HTMX事件
const htmxEvents = [
  'htmx:afterRequest',
  'htmx:afterSettle',
  'htmx:afterSwap',
  'htmx:beforeRequest',
  'htmx:beforeSwap',
  'htmx:beforeSend',
  'htmx:configRequest',
  'htmx:confirm',
  'htmx:historyCacheMiss',
  'htmx:historyRestore',
  'htmx:load',
  'htmx:prompt',
  'htmx:responseError',
  'htmx:sendError',
  'htmx:targetError',
  'htmx:timeout',
  'htmx:beforeCleanupElement'
]

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
      // 初始化事件管理器
      if (!el._htmxEventManager) {
        el._htmxEventManager = createEventManager(el)
      }

      // 处理事件绑定
      const eventMap = {}
      if (binding.value?.on && typeof binding.value.on === 'object') {
        Object.entries(binding.value.on).forEach(([eventName, handler]) => {
          const htmxEventName = eventName.startsWith('htmx:') ? eventName : `htmx:${eventName}`
          eventMap[htmxEventName] = (event) => {
            if (typeof handler === 'function') {
              handler.call(vnode.context, event)
            }
          }
        })
      }

      // 增量更新事件监听器，添加防抖处理
      el._htmxEventManager.updateEvents(eventMap, { debounce: 10 })
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
      // 销毁事件管理器
      if (el._htmxEventManager) {
        el._htmxEventManager.destroy()
        el._htmxEventManager = null
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

// 核心Htmx组件
const HtmxComponent = defineComponent({
  name: 'Htmx',
  props: {
    tag: {
      type: String,
      default: 'div'
    },
    ...htmxProps,
    ...htmxEvents.reduce((props, eventName) => {
      const propName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1).replace(/:/g, '')}`
      props[propName] = Function
      return props
    }, {})
  },
  emits: htmxEvents.map(eventName => `htmx${eventName.charAt(0).toUpperCase()}${eventName.slice(1).replace(/:/g, '')}`),
  setup(props, { emit, slots }) {
    const element = ref(null)
    let eventManager = null

    // 初始化事件管理器
    const initEventManager = () => {
      if (!element.value) return

      // 创建事件管理器实例
      eventManager = createEventManager(element.value)

      // 注册事件监听器
      updateEventListeners()
    }

    // 更新事件监听器（增量更新）
    const updateEventListeners = () => {
      if (!eventManager) return

      // 创建事件映射
      const eventMap = htmxEvents.reduce((map, eventName) => {
        const propName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1).replace(/:/g, '')}`
        const handler = props[propName] || ((event) => emit(`htmx${eventName.charAt(0).toUpperCase()}${eventName.slice(1).replace(/:/g, '')}`, event))

        map[eventName] = handler
        return map
      }, {})

      // 增量更新事件监听器，添加防抖处理
      eventManager.updateEvents(eventMap, { debounce: 10 })
    }

    // 清理事件管理器
    const cleanupEventManager = () => {
      if (eventManager) {
        eventManager.destroy()
        eventManager = null
      }
    }

    onMounted(async() => {
      await nextTick()
      if (!element.value || !window.htmx) return

      // 初始化HTMX
      window.htmx.process(element.value)
      initEventManager()
    })

    onUnmounted(() => {
      cleanupEventManager()
    })

    // 监听props变化，更新HTMX属性和事件监听器
    watch(() => props, async(newProps) => {
      await nextTick()
      if (!element.value || !window.htmx) return

      // 更新HTMX属性
      Object.entries(newProps).forEach(([key, value]) => {
        if (htmxProps[key] && value !== undefined) {
          const attrName = key === 'hxBoost' ? 'hx-boost' : key.replace(/([A-Z])/g, '-$1').toLowerCase()
          element.value.setAttribute(attrName, value)
        }
      })

      // 增量更新事件监听器
      updateEventListeners()

      // 重新处理HTMX
      window.htmx.process(element.value)
    }, { deep: true })

    return () => h(props.tag, { ref: element }, slots.default?.())
  }
})

// Vue插件安装函数
const HtmxPlugin = {
  install(app) {
    // 注册v-htmx指令
    app.directive('htmx', HtmxDirective)

    // 提供全局HTMX实例
    app.config.globalProperties.$htmx = window.htmx

    // 注册全局组件
    const HtmxElement = defineComponent({
      name: 'HtmxElement',
      props: {
        tag: {
          type: String,
          default: 'div'
        },
        hx: Object
      },
      setup(props, { slots, attrs }) {
        const element = ref(null)

        onMounted(async() => {
          await nextTick()
          if (props.hx && window.htmx && element.value) {
            Object.entries(props.hx).forEach(([key, value]) => {
              const attributeKey = key.startsWith('hx-') ? key : `hx-${key}`
              element.value.setAttribute(attributeKey, value)
            })
            window.htmx.process(element.value)
          }
        })

        return () => h(props.tag, { ...attrs, ref: element }, slots.default?.())
      }
    })
    app.component('HtmxElement', HtmxElement)
    app.component('Htmx', HtmxComponent)
  }
}

// Vue 2 兼容导出
if (window.Vue) {
  window.Vue.directive('htmx', HtmxDirective)
}

export default HtmxPlugin
export { HtmxDirective }
