import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // 本地开发时把 /api 转发到 vercel dev 或本地 node
      '/api': 'http://localhost:3000'
    }
  }
})
