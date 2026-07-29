[C8 Take4: CC(P3) ⇒ Dex(P4)]

# P3 完了報告 Take4: Vitest設定名の訂正（maxForks → maxWorkers）

- 対象ブランチ: `cc-cycle8`
- レビュー対象HEAD: push後に追記します
- 対応した指示書: `docs/handoff/P4_Rollback/cycle_8_take4_vitest_worker_config_request.md`（Dex差戻し、Reviewed HEAD: `859c99e`）
- Take3報告: `docs/handoff/P3_CC_to_Dex/cycle_8_take3_report.md`（訂正済み）
- Take3レビュー: `docs/handoff/P4_Dex_Review/cycle_8_take3_review.md`（P4 NG、Vitest設定と説明の訂正のみ・製品ロジックと追加テストは承認可能）

**`frontend/src/App.jsx`・`frontend/src/App.cycle8.test.jsx`は一切変更していません。`main`へはmergeしていません。バージョンは`v4.30`のまま変更していません。**

## 対応内容

Dexの指摘: このリポジトリのVitestは4.1.10であり、worker上限の設定名は`maxWorkers`である。`maxForks`は定義されておらず、Take3で指定した値は無視されていた。またVitest 4.1.10の標準poolは既に`forks`であり、「既定のthreadsからforksへ変更してメモリ問題を解消した」というTake3の原因説明も成立しない。

### 1. `frontend/vitest.config.js`の設定名を訂正

```diff
-    pool: 'forks',
-    maxForks: 2,
+    pool: 'forks',
+    maxWorkers: 2,
```

`maxForks`は削除し、`maxWorkers: 2`へ置き換えました。`pool: 'forks'`自体は明示的な指定として維持しています（Vitest 4.1.10の既定値と同じですが、設定を明示しておくことで将来のVitestバージョンアップで既定値が変わった場合にも意図が保たれます）。

### 2. コードコメントの訂正

「既定の`threads`プールから`forks`へ変更した」という誤った説明を、「Vitest 4.1.10の標準poolは既に`forks`である」という正しい説明へ訂正しました。

```js
// Cycle8 Take3/Take4(Dex差戻し): Vitest 4.1.10の標準poolは既に`forks`であり、
// ファイルごとに独立したOSプロセスを使うためファイル完了時にメモリが確実に
// 解放される(Take3で「既定threadsからforksへ変更した」と説明したのは誤り、
// Take4で訂正)。Dex環境では標準の一括実行で1.2GB近くまで増加し完走しなかった
// ことから、同時に立ち上がるworker数を明示的に制限してピークメモリを予測可能な
// 範囲に収める必要があった。Vitest 4.1.10ではforksプールの同時実行数は
// `maxWorkers`で指定する(`maxForks`という設定名は存在せず無視される、Take3の誤り)。
pool: 'forks',
maxWorkers: 2,
```

### 3. Take3の報告書・レビュー依頼の説明を訂正

- `docs/handoff/P3_CC_to_Dex/cycle_8_take3_report.md`: 「原因分析」「対応」「採用理由」「実測」の各節を、標準poolが元から`forks`であること・設定名が`maxWorkers`であることに合わせて訂正し、「訂正の経緯（Take4で追記）」の節を追加しました。「変更ファイル」節の説明も訂正しています。
- `docs/handoff/P4_CC_to_Dex/cycle_8_take3_review_request.md`: 対応内容の要約(4番)に、Take4での訂正内容と参照先を追記しました。

新規にTake3の報告書を作り直すのではなく、既存ファイルを直接訂正する方針としました（Dexの指摘が「Take3 P3報告書とP4レビュー依頼に残る同じ説明を訂正」と明記していたため）。

## 変更ファイル

- `frontend/vitest.config.js`（`maxForks: 2` → `maxWorkers: 2`、コードコメント訂正）
- `docs/handoff/P3_CC_to_Dex/cycle_8_take3_report.md`（誤った原因説明・設定名の訂正）
- `docs/handoff/P4_CC_to_Dex/cycle_8_take3_review_request.md`（同上）

`frontend/src/App.jsx`・`frontend/src/App.cycle8.test.jsx`・バックエンド・API・solverには一切触れていません。

## 検証内容

### 標準検証コマンド（連続2回実行）

```text
npm --prefix frontend test    -> 1回目: Test Files 5 passed / Tests 63 passed（約61秒、異常終了なし）
npm --prefix frontend test    -> 2回目: Test Files 5 passed / Tests 63 passed（約58秒、異常終了なし）
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
git diff --check              -> 問題なし
```

`vitest`実行時に`maxForks`に関する非推奨・無視の警告は出なくなりました（Take3実行時に出ていた`DEPRECATED poolOptions`警告は既にTake3で解消済みで、Take4では新たな警告は確認していません）。

`git diff --stat -- frontend/src/App.jsx frontend/src/App.cycle8.test.jsx`で両ファイルに差分がないことも確認しています。

## CCクルー利用判断

不使用。理由: 設定名を1箇所訂正するだけの、影響範囲が非常に狭い機械的な修正であり、実行結果（63/63 PASS、2周連続）で直接検証可能なため。

## 実機確認について

今回はVitest設定名とテスト外(handoff文書)の説明訂正のみで、`App.jsx`（製品ロジック）には触れていないため、実機での挙動そのものへの影響はありません。

## まだ不安な点・Dexに特に見てほしい点

- `maxWorkers: 2`が実際にDex環境でも意図通り機能し、63/63の2周連続PASSが安定するかご確認をお願いします。

## Kazumax確認レベル

現時点では確認不要（Vitest設定名とhandoff文書の説明訂正のみで、製品ロジック・バージョン表記・テスト本体は変更していないため）。Dex(P4)の再レビューは必須です。
