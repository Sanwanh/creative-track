import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 生產建置:壓縮 + 不輸出 sourcemap;把 React 等第三方拆成 vendor chunk,
// 讓自家程式碼獨立成一塊,build 後只對自家程式碼做強混淆(見 scripts/obfuscate.mjs)。
export default defineConfig({
  // 相對路徑:讓打包後的資產在 GitHub Pages 子路徑(/<repo>/)也能正確載入
  base: './',
  plugins: [react()],
  build: {
    target: 'es2018',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
