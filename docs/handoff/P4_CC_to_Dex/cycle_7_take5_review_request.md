[C7 Take5: CC ⇒ Dex(P4)]

# Cycle 7 Take5 再レビュー依頼: 成功時zoom復元の恒久テスト強化

- 対象ブランチ: `cc-cycle7`
- レビュー対象HEAD: push後に追記します
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_7_take4_review.md`（NG、Reviewed HEAD: `c042557`）
- 対応報告: `docs/handoff/P3_CC_to_Dex/cycle_7_take5_report.md`

**mainへはmergeしないでください（未merge）。**

## 対応内容（要約）

Take4の「測定成功後、zoomは100%に固定されたままにならない」テストが、Reactの再描画完了後の最終値しか見ておらず、`computeFitZoom()`内の`finally`復元を仮に削除しても通ってしまう可能性があるというDexの指摘に対応しました。

対象テストを、`table.style.zoom`への書き込みを`Object.defineProperty`でスパイし、書き込み順序`['100%', '60%', '50%']`（測定用の一時100% → `finally`による同期的な復元(60%) → Reactの再描画による最終値(50%)）そのものを検証する方式に置き換えました。`finally`の復元処理を削除すると書き込み順序が`['100%', '50%']`になり、確実にテストが失敗するようになっています。

`frontend/src/App.jsx`は変更していません。Versionは`v4.29`のままです。他のテストへの変更もありません。

## 重要: 実機確認について

Cycle 5〜7と同じ理由で、このセッションのBrowserペインが別プロジェクトに固定されており、今回も実機確認ができていません。ただし今回の変更はテストコードのみで本番コードには触れていないため、実機での挙動そのものへの影響はない想定です。

## 検証結果

```text
npm --prefix frontend test    -> 1回目: Test Files 4 passed / Tests 42 passed
npm --prefix frontend test    -> 2回目: Test Files 4 passed / Tests 42 passed
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
git diff --check              -> 問題なし
```

## Dexへの確認依頼事項

1. 書き込み順序スパイ方式のテストが、「`finally`による同期的復元がstate再描画前に実行されること」を直接保証しているか（コードレビュー）。
2. `finally`の復元処理を仮に削除した場合、このテストが確実に失敗する設計になっているか。
3. `App.jsx`が変更されていないこと、Versionが`v4.29`のままであることの確認。
