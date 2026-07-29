[C8 Take3: CC ⇒ Dex(P4)]

# Cycle 8 Take3 再レビュー依頼: 恒久テスト補強とテスト実行安定性の改善

- 対象ブランチ: `cc-cycle8`
- レビュー対象HEAD: push後に追記します
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_8_take2_review.md`（P4 NG、テスト補強のみ・実装本体に重大不具合なし、Reviewed HEAD: `1b48d3e`）
- 対応報告: `docs/handoff/P3_CC_to_Dex/cycle_8_take3_report.md`

**`frontend/src/App.jsx`（製品ロジック）は一切変更していません。mainへはmergeしないでください（未merge）。バージョンは`v4.30`のまま変更していません。**

## 対応内容（要約）

Take2 P4レビューの4件の指摘すべてに対応しました。

1. `matrix`と`employees[].requests`の「完全一致」テストを、件数比較から日番号配列の直接比較(`toEqual`)へ厳密化。
2. PC・スマホ同一判定の恒久テストへ、不足・標準・超過の代表値をスマホ詳細でも検証するテストを追加（同一データをPC/スマホ両方でレンダリングし判定・文言の一致を確認）。
3. 空き不足テストへ「空き2日・目標4日」の部分不足ケースを追加し、配置可能な2日全てがmatrix・requestsへ反映されること、通知が「目標4日・実際2日」になることを確認。
4. `frontend/vitest.config.js`を`pool: 'forks', maxForks: 2`へ変更し、標準の一括実行コマンドが61→63件を2周連続でPASSするようにした（timeout延長では対応せず、テスト実行方式自体を変更）。

## CCクルー利用判断

不使用。理由: 対応範囲がテストコードとvitest設定のみに限定され、Dexの指摘4件へ1対1で機械的に対応する狭い作業だったため、CCクルーより実際のテスト実行結果での確認を優先しました。詳細はP3報告参照。

## 検証結果

```text
npm --prefix frontend test    -> 1回目: Test Files 5 passed / Tests 63 passed（約80秒）
npm --prefix frontend test    -> 2回目: Test Files 5 passed / Tests 63 passed（約89秒）
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
git diff --check              -> 問題なし
```

`git diff --stat`で`frontend/src/App.jsx`に差分がないことも確認済みです。

## Dexへの確認依頼事項

1. 4件の指摘それぞれが、意図通り修正されているか（特に、日番号配列の直接比較が本当に偽陽性を防げているか）。
2. `pool: 'forks', maxForks: 2`への変更が、Dex環境での標準一括実行（メモリ増大・完走不能の再現環境）でも安定して61→63件PASSするか。このセッションでは元々問題が再現していなかったため、Dex環境での再実行確認をお願いします。
3. `frontend/src/App.jsx`に一切差分がないこと、バージョンが`v4.30`のままであることの確認。
