/**
 * Type definitions for HTMX Framework Integrations
 */

declare module 'react-htmx' {
  import React from 'react';

  interface HtmxProps extends React.HTMLAttributes<HTMLElement> {
    // HTMX Attributes
    hxGet?: string;
    hxPost?: string;
    hxPut?: string;
    hxPatch?: string;
    hxDelete?: string;
    hxSwap?: string;
    hxTarget?: string;
    hxSelect?: string;
    hxTrigger?: string;
    hxInclude?: string;
    hxParams?: string;
    hxHeaders?: string | Record<string, string>;
    hxVals?: string | Record<string, any>;
    hxConfirm?: string;
    hxPrompt?: string;
    hxIndicator?: string;
    hxDisable?: boolean;
    hxBoost?: boolean;
    hxPushUrl?: boolean | string;
    hxReplaceUrl?: boolean | string;
    hxHistory?: boolean;
    hxHistoryElt?: boolean;
    hxSse?: string;
    hxWs?: string;
    hxExt?: string;
    hxDisinherit?: string;
    hxInherit?: string;
    hxPreserve?: string;
    hxSync?: string;
    
    // HTMX Event Handlers
    onHtmxAbort?: (event: CustomEvent) => void;
    onHtmxAfterRequest?: (event: CustomEvent) => void;
    onHtmxAfterSettle?: (event: CustomEvent) => void;
    onHtmxAfterSwap?: (event: CustomEvent) => void;
    onHtmxBeforeRequest?: (event: CustomEvent) => void;
    onHtmxBeforeSwap?: (event: CustomEvent) => void;
    onHtmxBeforeSend?: (event: CustomEvent) => void;
    onHtmxConfigRequest?: (event: CustomEvent) => void;
    onHtmxError?: (event: CustomEvent) => void;
    onHtmxLoad?: (event: CustomEvent) => void;
    onHtmxNoSourceError?: (event: CustomEvent) => void;
    onHtmxResponseError?: (event: CustomEvent) => void;
    onHtmxSseError?: (event: CustomEvent) => void;
    onHtmxSseMessage?: (event: CustomEvent) => void;
    onHtmxValidate?: (event: CustomEvent) => void;
    onHtmxWsBeforeMessage?: (event: CustomEvent) => void;
    onHtmxWsAfterMessage?: (event: CustomEvent) => void;
    onHtmxWsOpen?: (event: CustomEvent) => void;
    onHtmxWsClose?: (event: CustomEvent) => void;
    
    // Component customization
    as?: keyof JSX.IntrinsicElements | React.ComponentType<any>;
  }

  interface HtmxHandle {
    triggerEvent: (eventName: string, detail?: any) => boolean;
    process: () => void;
    values: () => Record<string, any>;
    element: HTMLElement | null;
  }

  interface UseHtmxResult {
    triggerEvent: (element: HTMLElement, eventName: string, detail?: any) => boolean;
    ajax: (options: any) => void;
    htmx: HtmxInternalApi | null;
  }

  const Htmx: React.ForwardRefExoticComponent<HtmxProps & React.RefAttributes<HtmxHandle>>;
  export const useHtmx: () => UseHtmxResult;
  export default Htmx;
}

declare module 'vue-htmx' {
  import type { Directive, Plugin } from 'vue'

  interface HtmxDirectiveOptions {
    [key: string]: any
  }

  interface HtmxComposable {
    trigger: (target: Element, eventName: string, detail?: any) => void
    process: (target: Element) => void
    refresh: (target: Element) => void
    ajax: (options: any) => Promise<any>
  }

  export const vHtmx: Directive<HTMLElement, HtmxDirectiveOptions>
  export function useHtmx(): HtmxComposable
  export const HtmxPlugin: Plugin
}

declare module 'svelte-htmx' {
  interface HtmxProps {
    tag?: string
    children?: any
    htmxTrigger?: string
    htmxRefresh?: boolean
    [key: string]: any
  }

  export function Htmx(props: HtmxProps): any

  interface HtmxComposable {
    trigger: (target: Element, eventName: string, detail?: any) => void
    process: (target: Element) => void
    refresh: (target: Element) => void
    ajax: (options: any) => Promise<any>
    takeClass: (target: Element, className: string) => void
    giveClass: (target: Element, className: string) => void
    htmx: any | null
  }

  export function useHtmx(): HtmxComposable

  interface HtmxPlugin {
    name: string
    initialize: () => void
  }

  export function HtmxPlugin(): HtmxPlugin
}

declare module 'htmx-state-sync' {
  interface StateSyncConfig {
    autoSync?: boolean;
    debounceMs?: number;
    debug?: boolean;
  }

  interface StateSync {
    init: (config?: StateSyncConfig) => void;
    syncHtmxToFramework: (element: HTMLElement, frameworkUpdater: (element: HTMLElement) => void) => void;
    syncFrameworkToHtmx: (element: HTMLElement, props: Record<string, any>) => void;
    unsyncElement: (element: HTMLElement) => void;
    setupEventBridge: (frameworkEmit: (eventName: string, detail: any) => void) => () => void;
    bulkSync: (elementsWithUpdaters: Array<{ element: HTMLElement; updater: (element: HTMLElement) => void }>) => void;
    queueUpdate: (element: HTMLElement, updateFn: () => void) => void;
    config: StateSyncConfig;
  }

  const StateSync: StateSync;
  export default StateSync;
}

/**
 * HTMX Internal API Type Definitions
 */
declare interface HtmxInternalApi {
  version: string;
  config: HtmxConfig;
  on: (eventName: string, handler: (event: Event) => void) => void;
  off: (eventName: string, handler: (event: Event) => void) => void;
  trigger: (elt: Element, eventName: string, detail?: any) => boolean;
  ajax: (options: any) => void;
  process: (elt: Element) => void;
  find: (selector: string) => Element | null;
  findAll: (selector: string) => Element[];
  closest: (elt: Element, selector: string) => Element | null;
  values: (elt: Element, type?: string) => Record<string, any>;
  remove: (elt: Element) => void;
  addClass: (elt: Element, className: string) => void;
  removeClass: (elt: Element, className: string) => void;
  toggleClass: (elt: Element, className: string) => void;
  takeClass: (elt: Element, className: string) => void;
  swap: (target: Element, newContent: string | Element, swapStyle?: string) => void;
  defineExtension: (name: string, extension: HtmxExtension) => void;
  removeExtension: (name: string) => void;
  logAll: () => void;
  logNone: () => void;
  logger: HtmxLogger;
}

declare interface HtmxConfig {
  historyEnabled?: boolean;
  historyCacheSize?: number;
  refreshOnHistoryMiss?: boolean;
  defaultSwapStyle?: string;
  defaultSwapDelay?: number;
  defaultSettleDelay?: number;
  includeIndicatorStyles?: boolean;
  indicatorClass?: string;
  requestClass?: string;
  addedClass?: string;
  settlingClass?: string;
  swappingClass?: string;
  allowEval?: boolean;
  allowScriptTags?: boolean;
  inlineScriptNonce?: string;
  inlineStyleNonce?: string;
  attributesToSettle?: string[];
  withCredentials?: boolean;
  timeout?: number;
  wsReconnectDelay?: string | ((retryCount: number) => number);
  wsBinaryType?: string;
  realtime?: HtmxRealtimeConfig;
}

declare interface HtmxRealtimeConfig {
  autoDetect?: boolean;
  transportPriority?: string[];
  reconnectAttempts?: number;
  reconnectDelay?: number;
  reconnectDelayMultiplier?: number;
  maxReconnectDelay?: number;
  heartbeatInterval?: number;
  heartbeatMessage?: string;
  maxQueueSize?: number;
  dropOldMessages?: boolean;
  indicatorClass?: string;
}

declare interface HtmxExtension {
  init?: (api: HtmxInternalApi) => void;
  onEvent?: (name: string, evt: Event) => boolean | void;
  transformResponse?: (text: string, xhr: XMLHttpRequest, elt: Element) => string;
  encodeParameters?: (xhr: XMLHttpRequest, parameters: any, elt: Element) => string;
  handleSwap?: (swapStyle: string, target: Element, fragment: DocumentFragment) => boolean;
  isInlineSwap?: (swapStyle: string) => boolean;
  getSelectors?: () => string[];
}

declare interface HtmxLogger {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

/**
 * Global HTMX declaration
 */
declare global {
  interface Window {
    htmx: HtmxInternalApi;
    HTMXStateSync: import('htmx-state-sync').StateSync;
    createWebSocket?: (url: string) => WebSocket;
  }
}
