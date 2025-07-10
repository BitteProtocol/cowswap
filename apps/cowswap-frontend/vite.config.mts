/// <reference types="vitest" />
import { lingui } from '@lingui/vite-plugin'
import react from '@vitejs/plugin-react-swc'
import stdLibBrowser from 'node-stdlib-browser'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, PluginOption, searchForWorkspaceRoot } from 'vite'
import macrosPlugin from 'vite-plugin-babel-macros'
import { ModuleNameWithoutNodePrefix, nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'
import svgr from 'vite-plugin-svgr'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { meta } from 'vite-plugin-meta-tags'

import * as path from 'path'

import { getReactProcessEnv } from '../../tools/getReactProcessEnv'

// eslint-disable-next-line no-restricted-imports
import type { TemplateType } from 'rollup-plugin-visualizer/dist/plugin/template-types'
import { robotsPlugin } from '../../tools/vite-plugins/robotsPlugin'

const allNodeDeps = Object.keys(stdLibBrowser).map((key) => key.replace('node:', '')) as ModuleNameWithoutNodePrefix[]

// Trezor getAccountsAsync() requires crypto and stream (the module is lazy-loaded)
const nodeDepsToInclude = ['crypto', 'stream']

const analyzeBundle = process.env.ANALYZE_BUNDLE === 'true'
const analyzeBundleTemplate: TemplateType = (process.env.ANALYZE_BUNDLE_TEMPLATE as TemplateType) || 'treemap' //  "sunburst" | "treemap" | "network" | "raw-data" | "list";

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  const plugins = [
    nodePolyfills({
      exclude: allNodeDeps.filter((dep) => !nodeDepsToInclude.includes(dep)),
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    react({
      plugins: [['@lingui/swc-plugin', {}]],
    }),
    viteTsConfigPaths({
      root: '../../',
    }),
    macrosPlugin(),
    lingui({
      cwd: 'apps/cowswap-frontend',
    }),
    svgr(),
    VitePWA({
      injectRegister: null,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      minify: true,
      injectManifest: {
        maximumFileSizeToCacheInBytes: 15000000, // 15mb - increased to handle large bundles
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,json,woff,woff2,md}'],
        rollupFormat: 'es',
        injectionPoint: undefined,
      },
      rollupOptions: {
        external: ['@noble/hashes/sha2', '@noble/hashes/hmac', '@noble/hashes/utils', '@noble/hashes/legacy'],
      },
    }),
    robotsPlugin({
      robotsDir: 'robots',
      publicPath: path.resolve(__dirname, './public'),
    }),
  ]

  if (analyzeBundle) {
    plugins.push(
      visualizer({
        template: analyzeBundleTemplate,
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: 'analyse.html', // will be saved in project's root
      }) as PluginOption,
    )
  }

  // Disable page indexing for non-prod envs
  if (!isProduction) {
    plugins.push(
      meta({}, undefined, [
        {
          tag: 'meta',
          injectTo: 'head-prepend',
          attrs: { name: 'robots', content: 'noindex,nofollow' },
        },
      ]),
    )
  }

  return {
    root: path.resolve(__dirname, './'),
    base: './',
    define: {
      ...getReactProcessEnv(mode),
    },

    assetsInclude: ['**/*.md'],

    cacheDir: '../../node_modules/.vite/cowswap-frontend',

    server: {
      port: 3000,
      host: 'localhost',
      fs: {
        allow: [
          // search up for workspace root
          searchForWorkspaceRoot(process.cwd()),
          // your custom rules
          'apps/cowswap-frontend/src',
          'libs',
        ],
      },
      proxy: {
        '/hook-dapp-omnibridge': {
          target: 'http://localhost:4317',
          changeOrigin: true,
        },
        '/api/bitte/chat': {
          target: 'https://ai-runtime-446257178793.europe-west1.run.app',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/bitte/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Add authentication header
              const bitteApiKey = process.env.BITTE_API_KEY || process.env.VITE_BITTE_API_KEY;
              if (bitteApiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${bitteApiKey}`);
              }
              
              // Ensure content-type is set for POST requests
              if (req.method === 'POST') {
                proxyReq.setHeader('Content-Type', 'application/json');
              }
            });
          },
        },
        '/api/bitte/history': {
          target: 'https://ai-runtime-446257178793.europe-west1.run.app',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/bitte/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Add authentication header
              const bitteApiKey = process.env.BITTE_API_KEY || process.env.VITE_BITTE_API_KEY;
              if (bitteApiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${bitteApiKey}`);
              }
            });
          },
        },
      },
    },

    preview: {
      port: 3000,
      host: 'localhost',
    },

    resolve: {
      alias: {
        'node-fetch': 'isomorphic-fetch',
        '@noble/hashes/legacy': path.resolve(__dirname, '../../node_modules/@noble/hashes/esm/legacy.js'),
        '@noble/hashes/hmac': path.resolve(__dirname, '../../node_modules/@noble/hashes/esm/hmac.js'),
        '@noble/hashes/sha2': path.resolve(__dirname, '../../node_modules/@noble/hashes/esm/sha2.js'),
        '@noble/hashes/utils': path.resolve(__dirname, '../../node_modules/@noble/hashes/esm/utils.js'),
      },
    },

    optimizeDeps: {
      include: [
        '@noble/hashes/legacy',
        '@noble/hashes/hmac',
        '@noble/hashes/sha2',
        '@noble/hashes/utils',
        '@scure/bip32',
        '@scure/bip39',
        'viem'
      ],
    },

    build: {
      assetsInlineLimit: 0, // prevent inlining assets
      assetsDir: 'static', // All assets go to /static/ directory
      // sourcemap: true, // disabled for now, as this is causing vercel builds to fail
      rollupOptions: {
        output: {
          // Remove hash for font files to enable preloading
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && (/StudioFeixen/i.test(assetInfo.name) || /Inter-/i.test(assetInfo.name))) {
              return 'static/[name][extname]' // Fonts without hash
            }
            return 'static/[name]-[hash][extname]' // Everything else with hash
          },
          manualChunks(id) {
            if (id.includes('@1inch')) return '@1inch'
            if (id.includes('@safe-global')) return '@safe-global'
            if (id.includes('viem')) return 'viem'
            if (id.includes('@sentry')) return '@sentry'
            if (id.includes('@uniswap')) return '@uniswap'
            if (id.includes('crypto-es/lib')) return 'crypto-es'
            if (id.includes('web3/dist')) return 'web3'
            if (id.includes('lottie-react')) return 'lottie-react'
          },
        },
      },
    },

    plugins,
  }
})