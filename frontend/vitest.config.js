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
    // Cycle8 Take3/Take4(Dex差戻し): Vitest 4.1.10の標準poolは既に`forks`であり、
    // ファイルごとに独立したOSプロセスを使うためファイル完了時にメモリが確実に
    // 解放される(Take3で「既定threadsからforksへ変更した」と説明したのは誤り、
    // Take4で訂正)。Dex環境では標準の一括実行で1.2GB近くまで増加し完走しなかった
    // ことから、同時に立ち上がるworker数を明示的に制限してピークメモリを予測可能な
    // 範囲に収める必要があった。Vitest 4.1.10ではforksプールの同時実行数は
    // `maxWorkers`で指定する(`maxForks`という設定名は存在せず無視される、Take3の誤り)。
    pool: 'forks',
    maxWorkers: 2,
  },
});
