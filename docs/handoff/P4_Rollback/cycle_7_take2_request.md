# Cycle 7 Take2 修正指示

## 結論

Cycle 7はP4 NGです。次の3件を修正し、`cc-cycle7`へpush後、DexへP4再レビューを依頼してください。`main`へはmergeしないでください。

## 修正1: 本当の「画面にフィット」を実装する

### 修正対象

- `frontend/src/App.jsx`
- `frontend/src/App.cycle7.test.jsx`
- 必要に応じて`frontend/src/index.css`

### 期待する状態遷移

- PC初期表示:
  - 1280pxでは全月がコンテナ内に収まる倍率を計算して適用する。
  - `scrollWidth <= clientWidth`となり、左右フロートボタンは非表示・無効。
- 拡大:
  - フィット倍率から拡大し、オーバーフローが発生した時点で右ボタンが表示される。
- 画面にフィット:
  - 現在のコンテナ幅と表の基準幅から倍率を再計算し、全月表示へ戻す。
  - 単に`setZoomLevel(100)`へ戻してはいけない。
- resize、タブ復帰、対象期間・従業員数変更後:
  - 必要なタイミングでフィット倍率とオーバーフロー状態を再計算する。

ボタン名は実挙動が分かる「画面にフィット」等を推奨します。表示倍率は実際に適用した倍率と一致させてください。

### 受入確認

1. 1280px初期表示で`scrollWidth <= clientWidth`、左右ボタン非表示。
2. 拡大を繰り返してオーバーフローすると右ボタンが表示され、350px移動できる。
3. 「画面にフィット」で再び`scrollWidth <= clientWidth`、`scrollLeft=0`、左右ボタン非表示。
4. 769pxでコントロールが画面外へはみ出さず、表操作を妨げない。
5. 画面幅変更・タブ往復後も表示倍率とボタン状態が正しく再計算される。

## 修正2: 氏名セルと詳細ダイアログのアクセシビリティ

### 修正対象

- `frontend/src/App.jsx`
- `frontend/src/App.cycle7.test.jsx`
- 必要に応じて`frontend/src/index.css`

### 期待する状態遷移

- 氏名トリガーはTabで到達でき、Enter/Spaceで詳細を開ける。
- 開いたカードは`role="dialog"`、`aria-modal="true"`、見出しとの関連付けを持つ。
- 開いた直後は閉じるボタン等へフォーカスを移す。
- 閉じるボタン、背景クリック、Escapeで閉じる。
- 閉じた後は起動元の氏名トリガーへフォーカスを戻す。
- 右上Xは`button`要素にし、`aria-label="閉じる"`を付ける。

### 受入確認

1. Tab -> Enterで開く。
2. Tab -> Spaceで開く。
3. Escapeで閉じる。
4. 閉じるボタンで閉じ、起動元へフォーカスが戻る。
5. ダイアログのrole・aria属性をテストで確認する。

## 修正3: スマホでは行ドラッグを無効化する

### 修正対象

- `frontend/src/App.jsx`
- `frontend/src/App.cycle7.test.jsx`

### 期待する状態遷移

- 768px以下ではドラッグ列を隠すだけでなく、行の`draggable`を無効化する。
- PCでは従来どおり並び替え可能。
- スマホの氏名タップと横スワイプを妨げない。

### 受入確認

1. 320/375/768pxで行の`draggable`がfalse。
2. 769/1280pxで行の`draggable`がtrue。
3. スマホで氏名タップが1回で開く。
4. スマホで横スクロールできる。

## 共通検証

- `npm.cmd --prefix frontend test`を2回連続PASS
- `node frontend/test_time_utils.mjs`を全件PASS
- `npm.cmd --prefix frontend run build`をPASS
- 320 / 375 / 768 / 769 / 1280pxの回帰観点を報告
- 実装変更のためVersionをv4.27へ更新
- P3報告とP4再レビュー依頼のHEADを、最終push後のcommitへ合わせる

## 触らない範囲

- シフト自動生成ロジック
- backend / API / DB / 保存形式
- PC固定列40px/140pxの基準
- スマホ氏名列105px
- スマホのフロートボタン非表示
- Cycle 6までに確定した横スクロールボタンの基本移動量

## 完了報告

`docs/handoff/P3_CC_to_Dex/cycle_7_take2_report.md`へ保存してください。

