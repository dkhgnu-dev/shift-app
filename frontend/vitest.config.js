import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    include: ['src/**/*.test.jsx'],
    // Cycle5 Take2: <App/>は24名×1ヶ月分のマトリクス(セルごとにselect等)を
    // まるごとレンダリングするため、jsdom上では1テストあたり5〜8秒かかることがある。
    // vitestの既定値(5000ms)を超えて散発的にタイムアウトしていたため引き上げる
    // (Dex Take2差戻し: 標準テストのタイムアウト)。
    testTimeout: 20000,
  },
});
