# Cycle 7 Take5 修正指示

## 結論

Cycle 7 Take4はP4 NGです。製品コードと実ブラウザ通常動作は合格しているため、成功時のzoom復元を直接保証する恒久テストだけを修正してください。`main`へはmergeしないでください。

## 修正対象

- `frontend/src/App.cycle7.test.jsx`

原則として`frontend/src/App.jsx`は変更しないでください。

## 修正: 成功時の復元を同期タイミングで直接検証

現在のテストは、React再描画後の最終zoom 50%だけを確認しています。これでは`finally`の成功時復元を削除しても通る可能性があります。

次の流れを直接観測するテストへ変更してください。

1. 測定前のzoomを記録する。
2. `scrollWidth` getter内でzoomが100%であることを確認する。
3. getterから戻った後、Reactの倍率state反映による再描画より前に、DOM zoomが測定前の値へ復元されたことを記録する。
4. 最後に算出倍率が適用されることも確認する。

実装方法は、style.zoomのsetter/getterを限定的に計測する、測定処理の同期イベント順を配列へ記録するなど、製品コードから`finally`の復元を削除すると確実に失敗する形にしてください。

## 受入確認

1. `table.style.zoom = '100%'`の測定を確認できる。
2. 成功経路で100%から測定前zoomへの復元を、state再描画前に直接確認できる。
3. 最終的に算出倍率が適用される。
4. 既存の例外時復元・state不変・descriptor復元テストを維持する。
5. テストで変更したdescriptorやprototypeを成功・例外時とも必ず復元する。

## 共通検証

- `npm.cmd --prefix frontend test`を2回連続PASS
- `node frontend/test_time_utils.mjs`を全件PASS
- `npm.cmd --prefix frontend run build`をPASS
- `git diff --check`をPASS
- テストのみの修正なのでVersionは`v4.29`のまま

## 触らない範囲

- `frontend/src/App.jsx`
- フィット倍率計算式
- resize・タブ復帰effect
- UI/CSS/固定列
- アクセシビリティ
- スマホ行ドラッグ
- シフト自動生成ロジック
- backend / API / DB / 保存形式

## 完了報告

`docs/handoff/P3_CC_to_Dex/cycle_7_take5_report.md`へ保存してください。
