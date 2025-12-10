/**
 * HTMX Framework Integrations
 * TypeScript Type Definitions
 */

declare module 'react-htmx' {
  import React, { DetailedHTMLProps, HTMLAttributes, ReactNode } from 'react';

  /**
   * HTMX Attributes interface
   */
  interface HtmxAttributes {
    // Core Attributes
    hxBoost?: boolean | string;
    hxConfirm?: string;
    hxDelete?: string;
    hxDisabledElt?: string;
    hxDisinherit?: string;
    hxExt?: string;
    hxGet?: string;
    hxHeaders?: string | Record<string, string>;
    hxHistoryElt?: boolean | string;
    hxHistory?: boolean | string;
    hxInclude?: string;
    hxIndicator?: string;
    hxInherit?: string;
    hxParams?: string;
    hxPatch?: string;
    hxPost?: string;
    hxPreserve?: string;
    hxPrompt?: string;
    hxPushUrl?: boolean | string;
    hxPut?: string;
    hxReplaceUrl?: boolean | string;
    hxRequest?: string | Record<string, any>;
    hxSelectOob?: string;
    hxSelect?: string;
    hxSwapOob?: string;
    hxSwap?: string;
    hxSync?: string;
    hxTarget?: string;
    hxTrigger?: string;
    hxVals?: string | Record<string, any>;
    hxVars?: string | Record<string, any>;

    // HTMX Events
    onHtmxAfterRequest?: (event: CustomEvent) => void;
    onHtmxAfterSettle?: (event: CustomEvent) => void;
    onHtmxAfterSwap?: (event: CustomEvent) => void;
    onHtmxBeforeRequest?: (event: CustomEvent) => void;
    onHtmxBeforeSwap?: (event: CustomEvent) => void;
    onHtmxBeforeSend?: (event: CustomEvent) => void;
    onHtmxConfirm?: (event: CustomEvent) => void;
    onHtmxConfigRequest?: (event: CustomEvent) => void;
    onHtmxHistoryCacheError?: (event: CustomEvent) => void;
    onHtmxHistoryCacheMiss?: (event: CustomEvent) => void;
    onHtmxHistoryCacheSave?: (event: CustomEvent) => void;
    onHtmxHistoryRestore?: (event: CustomEvent) => void;
    onHtmxLoad?: (event: CustomEvent) => void;
    onHtmxPrompt?: (event: CustomEvent) => void;
    onHtmxResponseError?: (event: CustomEvent) => void;
    onHtmxSendError?: (event: CustomEvent) => void;
    onHtmxSseError?: (event: CustomEvent) => void;
    onHtmxTargetError?: (event: CustomEvent) => void;
    onHtmxTimeout?: (event: CustomEvent) => void;
    onHtmxValidationFailed?: (event: CustomEvent) => void;
    onHtmxValidationHalted?: (event: CustomEvent) => void;
    onHtmxBeforeCleanupElement?: (event: CustomEvent) => void;

    // State Sync
    onHtmxAfterUpdate?: (detail: any) => void;
  }

  /**
   * Htmx Component Props
   */
  interface HtmxProps<T extends React.ElementType = 'div'> extends HtmxAttributes {
    as?: T;
    children?: ReactNode;
  }

  /**
   * Htmx Component
   */
  declare const Htmx: <T extends React.ElementType = 'div'>(
    props: React.PropsWithChildren<HtmxProps<T>> & React.RefAttributes<HTMLElement>
  ) => React.ReactElement;

  /**
   * Htmx Button Component
   */
  declare const HtmxButton: React.ForwardRefExoticComponent<
    DetailedHTMLProps<HTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & HtmxAttributes
  >;

  /**
   * Htmx Anchor Component
   */
  declare const HtmxA: React.ForwardRefExoticComponent<
    DetailedHTMLProps<HTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> & HtmxAttributes
  >;

  /**
   * Htmx Form Component
   */
  declare const HtmxForm: React.ForwardRefExoticComponent<
    DetailedHTMLProps<HTMLAttributes<HTMLFormElement>, HTMLFormElement> & HtmxAttributes
  >;

  /**
   * Htmx Input Component
   */
  declare const HtmxInput: React.ForwardRefExoticComponent<
    DetailedHTMLProps<HTMLAttributes<HTMLInputElement>, HTMLInputElement> & HtmxAttributes
  >;

  export default Htmx;
  export { HtmxButton, HtmxA, HtmxForm, HtmxInput, HtmxAttributes };
}

declare module 'vue-htmx' {
  import { Plugin, Directive } from 'vue';

  /**
   * HTMX Directive Options
   */
  interface HtmxDirectiveOptions {
    [key: string]: any;
    on?: Record<string, (event: CustomEvent) => void>;
    onAfterUpdate?: (detail: any) => void;
    sync?: string;
  }

  /**
   * Htmx Directive
   */
  declare const HtmxDirective: Directive;

  /**
   * Htmx Plugin
   */
  declare const HtmxPlugin: Plugin;

  declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
      $htmx: typeof import('htmx.org');
    }

    interface ComponentCustomDirectives {
      htmx: Directive<HTMLElement, HtmxDirectiveOptions>;
    }
  }

  export default HtmxPlugin;
  export { HtmxDirective };
}

declare module 'svelte-htmx' {
  import { ActionReturn } from 'svelte/action';

  /**
   * HTMX Action Options
   */
  interface HtmxActionOptions {
    [key: string]: any;
    on?: Record<string, (event: CustomEvent) => void>;
    sync?: (detail: any) => void;
  }

  /**
   * HTMX Action Return Type
   */
  interface HtmxActionReturn extends ActionReturn<HtmxActionOptions> {
    update?: (options: HtmxActionOptions) => void;
    trigger?: (eventName: string) => void;
    abort?: () => void;
    process?: () => void;
  }

  /**
   * HTMX Svelte Action
   */
  export function htmx(node: HTMLElement, options?: HtmxActionOptions): HtmxActionReturn;

  /**
   * Sync store with HTMX
   */
  export function syncStoreWithHtmx<T>(store: any, nodeSelector: string): void;

  /**
   * Htmx Custom Element
   */
  export class HtmxElement extends HTMLElement {
    static observedAttributes: string[];
    connectedCallback(): void;
    attributeChangedCallback(): void;
    render(): void;
  }
}

declare module 'state-sync' {
  /**
   * State Sync Strategy
   */
  interface SyncStrategy {
    getState?: (target: HTMLElement) => any;
    setState?: (target: HTMLElement, state: any) => void;
  }

  /**
   * State Sync Options
   */
  interface StateSyncOptions {
    debug?: boolean;
  }

  /**
   * Htmx State Sync Class
   */
  export class HtmxStateSync {
    constructor(options?: StateSyncOptions);
    init(): void;
    registerSyncStrategy(name: string, strategy: SyncStrategy): void;
    mapState(frameworkStateKey: string, htmxParamKey: string, transformer?: (value: any) => any): void;
    syncStateToRequest(xhr: XMLHttpRequest, target: HTMLElement): void;
    syncResponseToState(target: HTMLElement, response: any): void;
  }

  /**
   * Event Bridge Options
   */
  interface EventBridgeOptions {
    framework?: 'react' | 'vue' | 'svelte' | 'unknown';
  }

  /**
   * Htmx Event Bridge Class
   */
  export class HtmxEventBridge {
    constructor(options?: EventBridgeOptions);
    init(): void;
    registerEventMapping(htmxEventName: string, frameworkEventName: string): void;
  }

  export const htmxStateSync: HtmxStateSync;
  export const htmxEventBridge: HtmxEventBridge;
}
