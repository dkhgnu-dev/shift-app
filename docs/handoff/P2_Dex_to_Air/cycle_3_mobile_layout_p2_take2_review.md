# Cycle 3 スマホ版UI/UX最適化 — Dex P2事前レビュー Take 2

対象: `docs/handoff/P2_AirCrew_to_CC/cycle_3_mobile_layout_fix.md`
前提: Kazumax承認済みのA案（Cycle 2とCycle 3を`air-cc-dev`で一括P4/P5統合）
レビュー日: 2026-07-24

## 判定

**P2 NG（事務的な4条件を完了後、再設計なしでAirのP3着手可）**

A案により、Cycle 2とCycle 3を別々にP5しようとして混線する問題は解消します。P2の仕様も、app-containerのPC基本定義、物理viewportと手動表示モードの分離、actionの排他描画、fixed bottom barのsafe-area対応まで具体化され、概ね妥当です。

ただし「制御文字を除去済み」という報告と実ファイルが一致していません。実バイト確認でU+000Cが2個、U+000Bが2個残っています。このままのコピペ実装はCSSプロパティや表示バージョンを誤らせるため、P3着手を保留します。

## 着手許可の必須条件

1. `docs/handoff/P2_AirCrew_to_CC/cycle_3_mobile_layout_fix.md` の制御文字4個を完全に除去する。
   - `flex-direction` の直前: U+000C
   - `font-size` の直前: U+000C
   - `v4.16` と `v4.17` の直前: U+000B
   - 置換後は通常のASCII文字列になっていること、および制御文字検査が0件であることを確認する。
2. `CURRENT_STATUS.md` を、承認済みA案に合わせて更新する。
   - `Cycle 2+3をair-cc-devで一括P4/P5統合する`
   - `Cycle 3 P3後にDexが全差分をP4し、OK後にDexがmainへ一括P5する`
   - 既存の危険領域・Stop Conditionsは消さずに維持する。
3. P2指示書とCURRENT_STATUSだけを独立commitしてpushする。既存の`AGENTS.md`、`manuals/`、`.cursorrules`、`CLAUDE.md`などの同期・作業中差分は同梱しない。
4. push後のbaseline commitをP3報告へ記載する。P4では `origin/main...air-cc-dev` のCycle 2+3全体と、baselineからCycle 3実装HEADまでの差分の両方を確認する。

## P3実装範囲と検証（Take 1から維持）

- 変更対象は `frontend/src/App.jsx`、`frontend/src/index.css`、表示バージョン、P3報告書、必要最小限のUIテストに限定する。backend、solver、依存パッケージ、保存形式には触れない。
- 320px / 375px / 768px / 769pxでレイアウトを確認する。モバイルでは左空白・意図しない横scroll・action重複・末尾隠れがなく、PCでは横並びかつbottom bar非表示であること。
- `generatedResult`有無、loading中disabled、各actionが1回だけ既存handlerを呼ぶこと、手動PC/スマホ切替、sidebar・modal・loading overlayとの重なりを確認する。
- `npm --prefix frontend test`、`node frontend/test_time_utils.mjs`、`npm --prefix frontend run build` を実行する。
- Airは特例P3担当であり、自己承認は不可。実装後のDex P4を必須とする。

## デクスクルー補助レビュー

- 利用理由: UI仕様と一括統合の両面に複数の見落としがあり、Take 2で前回指摘の解消を独立確認するため。
- UI観点: app-container、bottom bar、viewport判定は解消を確認。制御文字4個の残存を確認。
- 統合観点: A案は採用。一方でCURRENT_STATUSの承認未反映、Stop Conditions消失、P2修正commit未pushを着手条件として採用。

## Airへの返却

上記4条件を満たしてcommit/pushした時点で、追加のP2再レビューは不要です。AirはCycle 3 P3を開始し、完了報告を `docs/handoff/P3_CC_to_Air/cycle_3_mobile_ux_report.md` に保存してください。

## Kazumax確認レベル

**確認不要** — A案はすでにKazumaxが明示承認済みです。残作業は文書・pushの整合化のみです。
