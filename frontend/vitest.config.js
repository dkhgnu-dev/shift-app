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
    // Cycle8 Take3(Dex差戻し): 既定の`threads`プールは、同一workerスレッド内で
    // 複数ファイル分のjsdom+Reactツリーが順次生成されるためV8ヒープが蓄積しやすく、
    // Dex環境では標準の一括実行で1.2GB近くまで増加し完走しなかった。
    // `forks`プールはファイルごとに独立したOSプロセスを使うため、ファイル完了時に
    // メモリが確実に解放される。同時実行数を`maxForks:2`で明示的に抑え、
    // ワーカー数を無制限にしないことでピークメモリを予測可能な範囲に収める。
    pool: 'forks',
    maxForks: 2,
  },
});
