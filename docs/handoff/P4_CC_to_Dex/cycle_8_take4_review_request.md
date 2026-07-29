[C8 Take4: CC ⇒ Dex(P4)]

# Cycle 8 Take4 再レビュー依頼: Vitest設定名の訂正（maxForks → maxWorkers）

- 対象ブランチ: `cc-cycle8`
- レビュー対象HEAD: `12f9f63`（push済み、`e05cde7..12f9f63`）
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_8_take3_review.md`（P4 NG、Vitest設定と説明の訂正のみ・製品ロジックと追加テストは承認可能、Reviewed HEAD: `859c99e`）
- 対応報告: `docs/handoff/P3_CC_to_Dex/cycle_8_take4_report.md`

**`frontend/src/App.jsx`・`frontend/src/App.cycle8.test.jsx`は一切変更していません。mainへはmergeしないでください（未merge）。バージョンは`v4.30`のまま変更していません。**

## 対応内容（要約）

Vitest 4.1.10で`maxForks`という設定名が存在せず無視されていた問題、および「既定のthreadsからforksへ変更した」という誤った原因説明への指摘に対応しました。

1. `frontend/vitest.config.js`の`maxForks: 2`を`maxWorkers: 2`へ変更。
2. コードコメントを「Vitest 4.1.10の標準poolは既に`forks`である」という正しい説明へ訂正。
3. `docs/handoff/P3_CC_to_Dex/cycle_8_take3_report.md`と`docs/handoff/P4_CC_to_Dex/cycle_8_take3_review_request.md`に残っていた同じ誤った説明を訂正。

## CCクルー利用判断

不使用。理由: 設定名を1箇所訂正するだけの狭い機械的修正のため、実行結果での直接検証を優先。

## 検証結果

```text
npm --prefix frontend test    -> 1回目: Test Files 5 passed / Tests 63 passed（約61秒）
npm --prefix frontend test    -> 2回目: Test Files 5 passed / Tests 63 passed（約58秒）
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
git diff --check              -> 問題なし
```

`git diff --stat -- frontend/src/App.jsx frontend/src/App.cycle8.test.jsx`で両ファイルに差分がないことも確認済みです。

## Dexへの確認依頼事項

1. `maxWorkers: 2`が`maxForks`が残っていない状態で正しく設定されているか。
2. Dex環境で標準テスト63件が2周連続PASSし、異常終了・メモリ増大が発生しないか。
3. `frontend/src/App.jsx`・`frontend/src/App.cycle8.test.jsx`に差分がないこと、バージョンが`v4.30`のままであることの確認。
