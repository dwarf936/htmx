# HTMX Framework Integrations

This project provides seamless integration between HTMX and modern frontend frameworks, along with an enhanced realtime communication extension.

## Features

### 1. Framework Integration Bridge

#### React Integration

The React HTMX component allows you to use HTMX attributes as React props with full TypeScript support.

**Installation:**
```bash
npm install react-htmx
```

**Usage Example:**
```tsx
import Htmx, { useHtmx } from 'react-htmx';

function UserList() {
  const [users, setUsers] = useState([]);
  const htmxRef = useRef(null);

  const handleUserAdded = (event) => {
    console.log('User added:', event.detail);
    // Refresh data after new user is added
    htmxRef.current?.process();
  };

  return (
    <div>
      <Htmx
        as="form"
        hxPost="/users"
        hxTarget="#user-list"
        hxSwap="afterbegin"
        onHtmxAfterSwap={handleUserAdded}
      >
        <input type="text" name="name" placeholder="Username" />
        <button type="submit">Add User</button>
      </Htmx>

      <Htmx
        ref={htmxRef}
        id="user-list"
        hxGet="/users"
        hxTrigger="load"
      />
    </div>
  );
}
```

#### Vue Integration

### Installation

```bash
npm install vue-htmx
```

```javascript
import { createApp } from 'vue'
import { HtmxPlugin } from 'vue-htmx'

const app = createApp(App)
app.use(HtmxPlugin)
app.mount('#app')
```

### Basic Usage

```vue
<template>
  <button 
    v-htmx="{
      'hx-get': '/api/data',
      'hx-target': '#result',
      'hx-swap': 'innerHTML'
    }"
    @htmx-request="onRequestStarted"
    @htmx-response="onResponseReceived"
  >
    Load Data
  </button>
  <div id="result"></div>
</template>

<script setup>
import { useHtmx } from 'vue-htmx'

const { trigger, ajax } = useHtmx()

function onRequestStarted() {
  console.log('Request started')
}

function onResponseReceived() {
  console.log('Response received')
}

// Programmatic AJAX call
async function fetchData() {
  const { response } = await ajax({
    method: 'GET',
    url: '/api/data',
    target: '#result'
  })
}
</script>
```

## Svelte Integration

### Installation

```bash
npm install svelte-htmx
```

```javascript
import { Htmx, useHtmx } from 'svelte-htmx'
```

### Basic Usage

```svelte
<script>
import { Htmx, useHtmx } from 'svelte-htmx'

const { trigger, ajax } = useHtmx()

function onRequestStarted(event) {
  console.log('Request started', event.detail)
}

function onResponseReceived(event) {
  console.log('Response received', event.detail)
}

// Programmatic AJAX call
async function fetchData() {
  const { response } = await ajax({
    method: 'GET',
    url: '/api/data',
    target: '#result'
  })
}
</script>

<Htmx
  hx-get="/api/data"
  hx-target="#result"
  hx-swap="innerHTML"
  on:htmx-request={onRequestStarted}
  on:htmx-response={onResponseReceived}
>
  Load Data
</Htmx>
<div id="result"></div>

<!-- Using custom tag -->
<Htmx tag="a" hx-get="/api/data" href="#">
  Load Data via Link
</Htmx>
```

### Plugin Initialization

```javascript
import { HtmxPlugin } from 'svelte-htmx'

const plugin = HtmxPlugin()
plugin.initialize()
```

### 2. State Synchronization

Prevents state inconsistencies between framework state and HTMX updates.

**Usage:**
```javascript
import StateSync from 'htmx-state-sync';

// Initialize state sync
StateSync.init({
  autoSync: true,
  debug: false
});

// Sync HTMX updates to React state
const userListRef = useRef(null);

useEffect(() => {
  if (userListRef.current) {
    StateSync.syncHtmxToFramework(userListRef.current, (element) => {
      setUsers(Array.from(element.querySelectorAll('.user')).map(user => ({
        id: user.dataset.id,
        name: user.textContent
      })));
    });
  }
}, []);
```

### 3. Enhanced Realtime Extension

The `realtime` extension provides unified support for WebSockets, Server-Sent Events, and Long-Polling with automatic fallback.

**Features:**
- 🤝 Unified API across all transport protocols
- 🛡️ Automatic fallback mechanism based on browser support
  ♻️ Exponential backoff reconnection logic
- 💓 Heartbeat monitoring
- 📦 Message queue with order guarantees
- 🟢 Visual connection state indicators

**Usage Example:**
```html
<!-- Connect to realtime server -->
<div 
  realtime-connect="wss://api.example.com/realtime"
  realtime-transport="websocket"
>
  <div class="htmx-realtime-indicator"></div>
  Connected
</div>

<!-- Receive realtime updates -->
<div 
  realtime-connect="wss://api.example.com/realtime"
  hx-swap-oob="true"
>
  <!-- Updates will be swapped in here automatically -->
</div>

<!-- Send messages via realtime connection -->
<form 
  realtime-send="wss://api.example.com/realtime"
  realtime-trigger="submit"
>
  <input type="text" name="message" placeholder="Type a message..." />
  <button type="submit">Send</button>
</form>
```

**Events:**
```javascript
// Listen to connection state changes
document.addEventListener('htmx:realtime:connected', (event) => {
  console.log('Connected to realtime server:', event.detail.url);
});

document.addEventListener('htmx:realtime:disconnected', (event) => {
  console.log('Disconnected from realtime server');
});

document.addEventListener('htmx:realtime:beforeMessage', (event) => {
  console.log('Received message:', event.detail.message);
});
```

## Configuration

### Realtime Extension Config

```javascript
hhtmx.config.realtime = {
  // Auto-detect best available transport
  autoDetect: true,
  // Transport priority order
  transportPriority: ['websocket', 'sse', 'long-polling'],
  // Reconnection settings
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  reconnectDelayMultiplier: 2,
  maxReconnectDelay: 30000,
  // Heartbeat settings
  heartbeatInterval: 30000,
  heartbeatMessage: 'ping',
  // Message queue settings
  maxQueueSize: 100,
  dropOldMessages: true,
  // Connection state indicator
  indicatorClass: 'htmx-realtime-indicator'
};
```

## TypeScript Support

Full TypeScript definitions are included for all components:
- React component props
- Vue plugin types
- HTMX API types
- State sync types

## Framework Specific Optimizations

### React
- Automatic cleanup of event listeners on unmount
- Support for React 18 concurrent features
- Server Components compatible
- Proper forwardRef support

### Vue
- Composition API support
- Directive lifecycle integration
- Vue 2 and Vue 3 compatible
- Teleport support

## Best Practices

1. **Keep HTMX requests focused**: Use HTMX for specific parts of your UI rather than full page loads
2. **Limit two-way data sync**: Only sync necessary state between framework and HTMX
3. **Use OOB swaps**: Leverage HTMX out-of-band swaps for targeted UI updates
4. **Implement loading states**: Use HTMX indicators to show loading state during requests
5. **Handle errors gracefully**: Listen to HTMX error events to provide better user experience

## License

MIT License - same as HTMX
