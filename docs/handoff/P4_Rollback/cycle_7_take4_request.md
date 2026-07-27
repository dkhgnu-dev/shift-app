# Cycle 7 Take4 修正指示

## 結論

Cycle 7 Take3はP4 NGです。通常動作は合格しているため、例外時のzoom復元保証と恒久テストだけを修正してください。`main`へはmergeしないでください。

## 修正対象

- `frontend/src/App.jsx`
- `frontend/src/App.cycle7.test.jsx`

## 修正1: zoomを必ず復元する

### 期待する状態遷移

- 測定成功:
  - 一時的に100%へ変更
  - 自然幅を読む
  - 元のzoomへ必ず復元
  - 算出した倍率を適用
- 測定失敗:
  - 元のzoomへ必ず復元
  - 現在の倍率stateを変更しない
  - 表示を壊さず処理を終了

`try/finally`を使って復元を保証してください。失敗時は`null`等を返し、呼び出し側が`setZoomLevel`を行わない設計を推奨します。古いclosure値を失敗時のフォールバック倍率として適用しないでください。

## 修正2: 核心処理と例外経路の恒久テスト

追加する確認:

1. `scrollWidth` getterが呼ばれた瞬間、対象tableの`style.zoom`が`100%`
2. 成功後、測定前のzoomへ復元
3. `scrollWidth` getterが例外を投げても測定前のzoomへ復元
4. 測定失敗時、画面上の倍率表示を変更しない
5. テストで上書きしたprototype descriptorを例外経路でも復元

既存の次のテストは維持してください。

- フィット済み再操作で倍率不変
- 拡大後の再フィット
- resize 50% -> 75% -> 50%
- アクセシビリティ
- スマホ`draggable`

## 受入確認

1. 自動テストで成功時・例外時のzoom復元を確認
2. 1280px初期55%と再フィット55%を維持
3. 1280 -> 1600 -> 1280pxで55 -> 74 -> 55%を維持
4. console warning/error 0件
5. `git diff --check` PASS

## 共通検証

- `npm.cmd --prefix frontend test`を2回連続PASS
- `node frontend/test_time_utils.mjs`を全件PASS
- `npm.cmd --prefix frontend run build`をPASS
- 実装変更のためVersionをv4.29へ更新
- P3報告とP4再レビュー依頼のHEADを最終push後のcommitへ合わせる

## 触らない範囲

- 正常系のフィット倍率計算式
- resize・タブ復帰のeffect構造
- ダイアログアクセシビリティ
- スマホ行ドラッグ無効化
- UIレイアウトと固定列
- シフト自動生成ロジック
- backend / API / DB / 保存形式

## 完了報告

`docs/handoff/P3_CC_to_Dex/cycle_7_take4_report.md`へ保存してください。

