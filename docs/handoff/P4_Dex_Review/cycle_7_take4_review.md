# Cycle 7 Take4 P4再レビュー

## 判定

**P4 NG。Take5差し戻し。main統合不可。**

製品コードの`try/catch/finally`、測定失敗時のstate保持、タブ復帰時の再計測、実ブラウザの通常動作は合格しました。ただし、Take4の核心である「測定成功時にも元のzoomへ必ず復元する」恒久テストが、復元処理そのものを直接検証できていません。

## レビュー対象

- Branch: `cc-cycle7`
- Target HEAD: `c042557e3cfd70ad6819a06d57244509a7847cc5`
- Implementation commit: `6692026`
- Base: `f78c75b`
- `6692026..c042557`: P3報告とP4依頼のpush済みHEAD表記更新

## Finding

### [P2] 成功時のzoom復元テストが偽陽性になり得る

- 該当: `frontend/src/App.cycle7.test.jsx:304-310`

現在のテストは`render(<App />)`完了後の最終的な`table.style.zoom === '50%'`を確認しています。しかし、製品コードの`finally`から`table.style.zoom = previousZoom`を削除しても、その後の`setZoomLevel(50)`によるReact再描画でstyleが50%へ上書きされるため、このテストは通る可能性があります。

差し戻し要件は「測定成功後、測定前のzoomへ復元」です。`scrollWidth` getterを読んだ直後、または`setZoomLevel`による再描画より前の同期タイミングで、元のzoomへ復元されたことを直接記録・検証してください。

## 合格したコード監査

- `computeFitZoom()`は`finally`で成功時・例外時ともzoomを復元する。
- 測定不能・例外時は`null`を返し、呼び出し側は倍率stateを変更しない。
- 古いclosure倍率をフォールバック適用していない。
- 例外時テストは表示倍率60%とDOM zoom 60%の保持を確認している。
- テストヘルパーは例外時も`clientWidth`/`scrollWidth` descriptorを復元する。
- `recalc()`の`updateScrollButtons()`常時実行は、同値state更新時の再計測漏れを補う最小変更で、重大な副作用やstale closureは見つからない。
- 変更範囲は`App.jsx`、Cycle 7テスト、handoffのみ。
- PC・スマホのVersionは`v4.29`。

## 実ブラウザ結果

### フィットとresize

- 1280px初期: 55%
- 1280pxで再フィット: 55%
- 1600px: 74%
- 1280pxへ戻す: 55%
- 全状態で全月右端がコンテナ内、左右ボタン無効

### タブ復帰

- 1280pxで65%へ拡大すると右スクロール可能
- 右端へ移動後、従業員管理へ移動
- 全体シフト表へ戻ると`scrollLeft=0`を再計測
- 自動フィット55%へ戻り、左右ボタンは無効

### 指定5幅

- 320 / 375 / 768px:
  - 氏名列105px
  - 日付列との境界差0px
  - ドラッグ列とフロートボタン非表示
  - 行`draggable=false`
- 769px:
  - PC表示、zoom 50%
  - コントロール右端737pxで画面内
  - 行`draggable=true`
- 1280px:
  - zoom 55%、全月表示
- ブラウザconsole warning/error: 0件

## 自動検証

- `npm.cmd --prefix frontend test`: 42/42 PASS（2回）
- `node frontend/test_time_utils.mjs`: 33/33 PASS
- `npm.cmd --prefix frontend run build`: PASS
- `git diff --check f78c75b..c042557`: PASS

## デクスクルー補助レビュー

使用しました。成功・例外時のzoom復元、テストの偽陽性、`recalc()`の副作用、範囲外変更を独立監査させました。

- 採用: 成功時のzoom復元テストが復元処理を直接守れていない。
- 解消判断を採用: 製品コードの`try/finally`、例外時state保持、descriptor復元。
- 解消判断を採用: `recalc()`の常時再計測に重大な副作用なし。

Dex本体のコード確認・実ブラウザ確認と統合し、テスト1件のみTake5差し戻しと判断しました。

## Kazumax確認レベル

**確認不要**

製品UIと実ブラウザ通常動作はDexが確認済みです。Take5は恒久テストの精度向上だけで、Kazumaxの見た目確認は不要です。
