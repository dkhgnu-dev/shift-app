# Cycle 3 スマホ版UI/UX最適化 — Dex P4レビュー Take 2

対象コードHEAD: `eb1451d` (`air-cc-dev`)
統合対象: `origin/main` `e15fc10` からCycle 2+3一括
レビュー日: 2026-07-24

## 判定

**OK — 承認済みA案に従い、Cycle 2+3を一括P5統合してよい。**

前回のP2指摘は解消された。

- rules/settingsでは、`.mobile-bottom-bar`自体を描画しない条件となり、空の固定帯は解消した。
- `CURRENT_STATUS.md` とP3 Take 2報告は最新化され、テスト種別もVitest 10件／Time Utils 33件／buildへ訂正された。
- デクスによるブラウザviewport実測で、320px、375px、768px、769pxのレイアウト・action bar・横scroll・z-index・入力サイズを確認した。

## ブラウザ実機相当のviewport確認

ローカルViteアプリをCodex in-app Browserで確認した。

| 幅 | 結果 |
| --- | --- |
| 320px | app/main/barは幅320px、document scrollWidth=clientWidth=320。dashboardのbottom barは「最適化シフトを生成」1個。 |
| 375px | app/main/barは幅375px、scrollWidth=clientWidth=375。employeesでは「新規追加」1個。rules/settingsではbottom barのDOM数0。モーダルは左右16px、入力computed font-size=16px。 |
| 768px | app/main/barは幅768px、scrollWidth=clientWidth=768。barはz-index 60、headerは50、mainの下余白は80px。 |
| 769px | sidebar幅240pxとmainが横並び。bottom barは0個、header actionは1個。 |

補足: 生成結果がない初期データのため、空欄自動作成ボタンの表示条件は既存の`generatedResult`分岐を静的確認した。`isNarrowViewport`は手動表示用の`isMobileView`から独立しており、barの表示条件を物理幅に限定している。

## 再実行した検証

- `npm --prefix frontend test`: 10 passed
- `node frontend/test_time_utils.mjs`: 33 passed
- `npm --prefix frontend run build`: success
- `origin/main...air-cc-dev`: left/right = `0/25`、merge-base = `e15fc10`。backend、DB、API、保存形式への変更なし。

`git diff --check`ではP3 Take 2報告の末尾空白1件と`index.css`末尾空行を検出した。動作・統合には影響しない軽微な整形であり、P5を妨げない。次回の文書/スタイル整形時に清掃する。

## デクスクルー補助レビュー

- 利用理由: Cycle 2+3一括統合と、複数viewportの表示・回帰確認を分けて確認するため。
- UI観点: 空barの解消を確認。初回報告で不足していた実ブラウザviewport測定をDexが補完し、受入とした。
- 統合観点: reviewed code HEAD `eb1451d` はorigin/mainの子孫でfast-forward可能。既存の共通マニュアル同期差分は統合対象外と確認。

## P5への引き継ぎ

DexはこのP4記録をcommit/push後、mainを`git pull --ff-only`で最新化し、`air-cc-dev`をfast-forward統合する。P5後はCURRENT_STATUS、mainのcommit hash、push結果、最終git statusを記録する。

## Kazumax確認レベル

**軽い確認** — 統合後、スマホ幅で「最適化シフトを生成」ボタンが画面下にあり、ルール設定画面では空の帯がないことだけ確認すればよい。
