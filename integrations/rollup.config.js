import terser from '@rollup/plugin-terser'

export default [
  // React HTMX
  {
    input: 'react-htmx.js',
    output: [
      {
        file: 'dist/react-htmx.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/react-htmx.umd.js',
        format: 'umd',
        name: 'ReactHtmx',
        sourcemap: true,
        globals: {
          react: 'React'
        }
      }
    ],
    plugins: [terser()],
    external: ['react', 'htmx.org']
  },
  // Vue HTMX
  {
    input: 'vue-htmx.js',
    output: [
      {
        file: 'dist/vue-htmx.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/vue-htmx.umd.js',
        format: 'umd',
        name: 'VueHtmx',
        sourcemap: true,
        globals: {
          vue: 'Vue'
        }
      }
    ],
    plugins: [terser()],
    external: ['vue', 'htmx.org']
  },
  // Svelte HTMX
  {
    input: 'svelte-htmx.js',
    output: [
      {
        file: 'dist/svelte-htmx.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/svelte-htmx.umd.js',
        format: 'umd',
        name: 'SvelteHtmx',
        sourcemap: true
      }
    ],
    plugins: [terser()],
    external: ['svelte', 'htmx.org']
  },
  // State Sync
  {
    input: 'state-sync.js',
    output: [
      {
        file: 'dist/state-sync.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/state-sync.umd.js',
        format: 'umd',
        name: 'HtmxStateSync',
        sourcemap: true
      }
    ],
    plugins: [terser()],
    external: ['htmx.org']
  },
  // Main entry point
  {
    input: 'index.js',
    output: [
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/index.umd.js',
        format: 'umd',
        name: 'HtmxIntegrations',
        sourcemap: true
      }
    ],
    plugins: [terser()],
    external: ['react', 'vue', 'svelte', 'htmx.org']
  }
]
