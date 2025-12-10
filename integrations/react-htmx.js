import React, { useEffect, useRef, forwardRef } from 'react'

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
  useEffect(() => {
    const element = forwardedRef.current
    if (!element) return

    const eventHandlers = {}

    // 注册HTMX事件监听器
    htmxEvents.forEach(eventName => {
      const handler = (event) => {
        const reactEventName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1).replace(/:/g, '')}`
        if (props[reactEventName]) {
          props[reactEventName](event)
        }
      }

      element.addEventListener(eventName, handler)
      eventHandlers[eventName] = handler
    })

    return () => {
      // 清理事件监听器
      Object.entries(eventHandlers).forEach(([eventName, handler]) => {
        element.removeEventListener(eventName, handler)
      })
    }
  }, [props])

  // 处理React状态与HTMX同步
  useEffect(() => {
    const element = forwardedRef.current
    if (!element || !window.htmx) return

    // 确保HTMX正确初始化
    window.htmx.process(element)

    // 监听HTMX更新，同步到React状态
    const handleAfterSwap = (event) => {
      if (props.onHtmxAfterUpdate) {
        props.onHtmxAfterUpdate(event.detail)
      }
    }

    element.addEventListener('htmx:afterSwap', handleAfterSwap)

    return () => {
      element.removeEventListener('htmx:afterSwap', handleAfterSwap)
    }
  }, [props])

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
