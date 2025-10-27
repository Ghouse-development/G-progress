import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Reactコアライブラリ
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabaseクライアント
          'vendor-supabase': ['@supabase/supabase-js'],
          // 日付処理
          'vendor-date': ['date-fns'],
          // チャート（重い）
          'vendor-charts': ['recharts'],
          // UI/アイコン
          'vendor-ui': ['lucide-react', 'framer-motion', 'clsx', 'tailwind-merge'],
          // PDFとExcel（超重い・必要時のみ読み込み）
          'vendor-export': ['jspdf', 'jspdf-autotable', 'xlsx', 'papaparse'],
        }
      }
    },
    chunkSizeWarningLimit: 600, // チャンクサイズ警告の閾値を600KBに設定
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 本番環境ではconsole.logを削除
        drop_debugger: true,
      }
    }
  },
  // 開発時のパフォーマンス改善
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js', 'date-fns'],
    exclude: ['@google/generative-ai'] // AI機能は必要時のみ
  }
})
