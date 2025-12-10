import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { createEventManager } from './event-manager.js'

// 将HTMX属性转换为React props的映射
const htmxAttributeMap = {
  hxBoost: 'hx-boost',
  hxConfirm: 'hx-confirm',
  hxDelete: 'hx-delete',
  hxDisabledElt: 'hx-disabled-elt',
  hxDisinherit: 'hx-disinherit',
  hxExt: 'hx-ext',
  hxGet: 'hx-get',
  hxHeaders: 'hx-headers',
  hxHistoryElt: 'hx-history-elt',
  hxHistory: 'hx-history',
  hxInclude: 'hx-include',
  hxIndicator: 'hx-indicator',
  hxInherit: 'hx-inherit',
  hxParams: 'hx-params',
  hxPatch: 'hx-patch',
  hxPost: 'hx-post',
  hxPreserve: 'hx-preserve',
  hxPrompt: 'hx-prompt',
  hxPushUrl: 'hx-push-url',
  hxPut: 'hx-put',
  hxReplaceUrl: 'hx-replace-url',
  hxRequest: 'hx-request',
  hxSelectOob: 'hx-select-oob',
  hxSelect: 'hx-select',
  hxSwapOob: 'hx-swap-oob',
  hxSwap: 'hx-swap',
  hxSync: 'hx-sync',
  hxTarget: 'hx-target',
  hxTrigger: 'hx-trigger',
  hxVals: 'hx-vals',
  hxVars: 'hx-vars'
}

// HTMX事件列表
const htmxEvents = [
  'htmx:afterRequest',
  'htmx:afterSettle',
  'htmx:afterSwap',
  'htmx:beforeRequest',
  'htmx:beforeSwap',
  'htmx:beforeSend',
  'htmx:confirm',
  'htmx:configRequest',
  'htmx:historyCacheError',
  'htmx:historyCacheMiss',
  'htmx:historyCacheSave',
  'htmx:historyRestore',
  'htmx:load',
  'htmx:prompt',
  'htmx:responseError',
  'htmx:sendError',
  'htmx:sseError',
  'htmx:targetError',
  'htmx:timeout',
  'htmx:validation:failed',
  'htmx:validation:halted',
  'htmx:beforeCleanupElement'
]

/**
 * HTMX React 包装组件
 * 允许在React中使用HTMX属性，并正确处理生命周期和事件桥接
 */
const Htmx = forwardRef(({ as: Component = 'div', children, ...props }, ref) => {
  const elementRef = useRef(null)
  const forwardedRef = ref || elementRef

  // 处理HTMX属性转换
  const getHtmxAttributes = () => {
    const attributes = {}

    Object.entries(props).forEach(([key, value]) => {
      // 处理驼峰式属性转换为短横线式
      if (htmxAttributeMap[key]) {
        attributes[htmxAttributeMap[key]] = value
      } else if (key.startsWith('hx')) {
        // 处理未在映射表中的hx属性
        const kebabCaseKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
        attributes[kebabCaseKey] = value
      } else {
        attributes[key] = value
      }
    })

    return attributes
  }

  // 事件桥接：将HTMX事件转换为React事件
  const eventManagerRef = useRef(null)

  useEffect(() => {
    const element = forwardedRef.current
    if (!element) return

    // 创建事件管理器实例
    eventManagerRef.current = createEventManager(element)

    // 创建事件映射
    const eventMap = htmxEvents.reduce((map, eventName) => {
      const reactEventName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1).replace(/:/g, '')}`
      const handler = props[reactEventName]

      if (handler) {
        map[eventName] = (event) => handler(event)
      }

      return map
    }, {})

    // 注册事件监听器，添加防抖处理
    eventManagerRef.current.addEvents(eventMap, { debounce: 10 })

    return () => {
      // 清理事件管理器
      if (eventManagerRef.current) {
        eventManagerRef.current.destroy()
        eventManagerRef.current = null
      }
    }
  }, [forwardedRef])

  // 增量更新事件监听器
  useEffect(() => {
    if (!eventManagerRef.current) return

    // 创建新的事件映射
    const newEventMap = htmxEvents.reduce((map, eventName) => {
      const reactEventName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1).replace(/:/g, '')}`
      const handler = props[reactEventName]

      if (handler) {
        map[eventName] = (event) => handler(event)
      }

      return map
    }, {})

    // 增量更新事件监听器
    eventManagerRef.current.updateEvents(newEventMap, { debounce: 10 })
  }, [props])

  // 处理React状态与HTMX同步
  useEffect(() => {
    if (!eventManagerRef.current || !window.htmx) return

    const element = forwardedRef.current
    if (!element) return

    // 确保HTMX正确初始化
    window.htmx.process(element)

    // 使用事件管理器注册同步事件
    const handleAfterSwap = (event) => {
      if (props.onHtmxAfterUpdate) {
        props.onHtmxAfterUpdate(event.detail)
      }
    }

    eventManagerRef.current.on('htmx:afterSwap', handleAfterSwap, { debounce: 0 })
  }, [props, forwardedRef])

  const attributes = getHtmxAttributes()

  return (
    <Component ref={forwardedRef} {...attributes}>
      {children}
    </Component>
  )
})

Htmx.displayName = 'Htmx'

// 导出常用HTMX组件快捷方式
export const HtmxButton = forwardRef((props, ref) => (
  <Htmx ref={ref} as="button" {...props} />
))

export const HtmxA = forwardRef((props, ref) => (
  <Htmx ref={ref} as="a" {...props} />
))

export const HtmxForm = forwardRef((props, ref) => (
  <Htmx ref={ref} as="form" {...props} />
))

export const HtmxInput = forwardRef((props, ref) => (
  <Htmx ref={ref} as="input" {...props} />
))

export default Htmx
