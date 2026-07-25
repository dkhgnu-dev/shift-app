# Cycle 5 Take3 修正指示

## 判定

Cycle 5 Take2はP4 NG。mainへmergeしないこと。

## 必須修正

### 固定列の5px重複を解消する

対象: `frontend/src/index.css`

現在は全セルに`min-width: 45px`があり、1列目の実幅は45pxだが、2列目が`left: 40px`で固定される。
横スクロール後、1列目と2列目が5px重なる。

次のどちらかで境界を一致させること。

1. 1列目を`width/min-width/max-width: 40px`へ厳密固定し、2列目の`left: 40px`を維持する
2. 1列目の45pxを維持し、2列目を`left: 45px`へ変更する

既存デザイン上、ドラッグ列を40pxとして設計・コメントしているため、原則として案1を推奨する。

## 検証条件

- 320 / 375 / 768 / 769 / 1280pxを実ブラウザで確認
- 横スクロール前後で、1列目の右端と2列目の左端が完全一致することを座標で実測
- 横スクロール後も1列目と氏名列が固定される
- 縦スクロール後も日付ヘッダーが固定される
- 月度ラベルが全幅で表示される
- 固定セル背景が不透明で、日付セルが透けない
- 従業員管理・ルール設定の320pxおよび769pxで表示崩れがない
- `npm --prefix frontend test`を連続2回PASS
- `node frontend/test_time_utils.mjs` PASS
- `npm --prefix frontend run build` PASS
- ブラウザconsole error/warnなし

## テスト記述

`App.matrixScroll.test.jsx`のDOM構造テストは残してよい。
ただし、stickyや実幅まで保証するように読めるテスト名・コメントがある場合は、実際の保証範囲へ合わせること。

## Version / Handoff

- 製品CSSを変更するため`v4.23`へ更新
- Take3報告書を`docs/handoff/P3_CC_to_Dex/`へ保存
- `CURRENT_STATUS.md`を更新
- `cc-cycle5`へcommit/push
- push後のHEADを報告書とDex向けトリガーに記載
- `main`へはmergeしない
