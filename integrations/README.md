# HTMX Framework Integrations

This project provides seamless integration between HTMX and modern frontend frameworks (React, Vue, Svelte), along with an enhanced real-time extension supporting WebSocket/SSE/long-polling with automatic fallback.

## Framework Integrations

### React HTMX

A React component wrapper that allows you to use HTMX attributes as React props with proper lifecycle handling.

#### Installation

```bash
npm install react-htmx htmx.org
```

#### Usage

```jsx
import Htmx, { HtmxButton, HtmxA } from 'react-htmx';

function App() {
  const handleAfterSwap = (event) => {
    console.log('HTMX swap completed:', event.detail);
  };

  return (
    <div>
      <HtmxA
        hxGet="/api/data"
        hxTarget="#result"
        hxSwap="innerHTML"
        onHtmxAfterSwap={handleAfterSwap}
      >
        Load Data
      </HtmxA>
      
      <div id="result" />

      <HtmxButton
        hxPost="/api/submit"
        hxConfirm="Are you sure you want to submit?"
      >
        Submit Form
      </HtmxButton>
    </div>
  );
}
```

#### Features
- All HTMX attributes available as camelCase React props
- Automatic conversion between camelCase and kebab-case
- Full event bridging from HTMX to React
- Proper cleanup of HTMX requests on component unmount
- Type-safe with TypeScript definitions

### Vue HTMX

A Vue custom directive that enables HTMX functionality in Vue templates.

#### Installation

```bash
npm install vue-htmx htmx.org
```

#### Usage (Vue 3)

```js
import { createApp } from 'vue';
import HtmxPlugin from 'vue-htmx';
import App from './App.vue';

const app = createApp(App);
app.use(HtmxPlugin);
app.mount('#app');
```

```vue
<template>
  <div>
    <!-- Object syntax -->
    <button
      v-htmx="{
        post: '/api/submit',
        target: '#result',
        swap: 'outerHTML',
        on: {
          afterSwap: handleAfterSwap
        }
      }"
    >
      Submit
    </button>

    <!-- Shorthand syntax -->
    <a v-htmx:get="'/api/data'" v-htmx:target="'#result'">
      Load Data
    </a>

    <div id="result" />
  </div>
</template>

<script setup>
const handleAfterSwap = (event) => {
  console.log('HTMX swap completed:', event.detail);
};
</script>
```

#### Features
- Dual syntax: object syntax for complex configurations and shorthand syntax for simple use cases
- Automatic cleanup on component unmount
- Vue event integration
- State synchronization support

### Svelte HTMX

A Svelte action for integrating HTMX functionality with proper reactivity.

#### Installation

```bash
npm install svelte-htmx htmx.org
```

#### Usage

```svelte
<script>
  import { htmx } from 'svelte-htmx';
  let data = { message: 'Hello' };

  const handleAfterSwap = (event) => {
    console.log('Data loaded:', event.detail);
  };
</script>

<button
  use:htmx={{
    post: '/api/submit',
    target: '#output',
    on: {
      afterSwap: handleAfterSwap
    }
  }}
>
  Submit Data
</button>

<div id="output" />

<!-- Dynamic updates -->
<button
  use:htmx="{
    get: `/api/data?id=${data.id}`,
    target: '#result'
  }"
  disabled={!data.id}
>
  Load Dynamic Data
</button>
```

#### Features
- Reactive HTMX attribute updates
- Svelte store synchronization
- Clean integration with Svelte reactivity system
- Type-safe with TypeScript definitions

## State Sync

The state synchronization library ensures that your framework state stays in sync with HTMX updates.

### Usage

```js
import { htmxStateSync } from 'state-sync';

// Register state mappings
htmxStateSync.mapState('user.name', 'username');
htmxStateSync.mapState('user.email', 'email', (value) => value.toLowerCase());

// Enable debug logging
htmxStateSync.debug = true;
```

### Features
- Automatic state synchronization between framework and HTMX
- Support for state transformation
- Works with React, Vue, and Svelte
- Automatic framework detection
- Debug logging for troubleshooting

## Realtime Extension

A powerful HTMX extension that provides unified real-time communication with WebSocket, SSE, and long-polling support with automatic fallback.

### Features

1.  **Unified Interface**: Single API for all real-time protocols
2.  **Automatic Fallback**: Automatically selects the best available protocol based on browser support
3.  **断线重连**: Exponential backoff with jitter for reliable reconnection
4.  **Heartbeat Detection**: Monitors connection health and automatically reconnects on failure
5.  **Message Queue**: Ensures messages are processed in the correct order
6.  **Connection State Indicators**: Visual indicators for connection status

### Installation

```html
<script src="https://unpkg.com/htmx.org@1.9.0"></script>
<script src="/ext/realtime.js"></script>
```

### Usage

```html
<!-- Connect to realtime server with automatic protocol selection -->
<div 
  hx-ext="realtime"
  realtime-connect="wss://api.example.com/realtime"
  realtime-options='{"preferredProtocol": "websocket", "maxReconnectAttempts": 5}'
  realtime-indicator
>
  Status: <span class="htmx-realtime-indicator"></span>
</div>

<!-- Send data via realtime connection -->
<button 
  realtime-send='{"type": "chat", "message": "Hello World"}'
>
  Send Message
</button>

<!-- Listen for realtime updates -->
<div 
  id="chat-messages"
  hx-on:htmx:realtime:message="handleNewMessage(event)"
>
</div>

<script>
  function handleNewMessage(event) {
    const message = event.detail;
    const container = document.getElementById('chat-messages');
    container.innerHTML += `<div>${message.content}</div>`;
  }
</script>
```

### Connection States

- `disconnected`: No active connection
- `connecting`: Establishing connection
- `connected`: Connection active and healthy
- `reconnecting`: Attempting to reconnect after failure

### Protocol Fallback Order

1.  **WebSocket**: Full-duplex communication when available
2.  **SSE**: Server-Sent Events for one-way streaming
3.  **Long-polling**: HTTP long-polling as fallback

## TypeScript Support

All packages include comprehensive TypeScript definitions:

```ts
import type { HtmxAttributes } from 'react-htmx';

interface MyComponentProps extends HtmxAttributes {
  title: string;
}
```

## Architecture Principles

1.  **渐进增强**: All integrations follow progressive enhancement principles
2.  **Framework Agnostic Core**: Shared logic works across all frameworks
3.  **Performance Optimized**: Minimal overhead, efficient cleanup
4.  **Type Safety**: Full TypeScript support
5.  **Interoperability**: Seamless integration with existing HTMX ecosystem

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Opera: Latest 2 versions

## License

MIT License
