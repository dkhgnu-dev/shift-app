# Cycle 6 Take2 修正指示

## 判定

Cycle 6はP4 NG。mainへmergeしないこと。

## 必須修正1: 320pxの左右ボタン重複

対象:

- `frontend/src/index.css`
- 必要なら`frontend/src/App.jsx`

320px時に左ボタン`x=221..261`、右ボタン`x=224..264`となり37px重なる。
右へ1回移動後は右ボタンが左ボタンを覆い、左へ戻る操作ができない。

狭幅でも以下を満たす配置にすること。

- 左右ボタンのクリック領域が1pxも重ならない
- 左ボタンは固定氏名列を不必要に覆わない
- 右ボタンは表右端から自然な余白を保つ
- 320 / 375 / 768 / 769 / 1280pxで成立する

固定pxだけで成立しない場合は、wrapper幅に応じた配置、左右中央寄せ、または320px専用breakpointを使用してよい。

## 必須修正2: タブ復帰時の再計算

対象: `frontend/src/App.jsx`

期待する状態:

1. 表を横スクロールする
2. 従業員管理またはルール設定へ移動する
3. ダッシュボードへ戻る
4. 新しいtable-containerの`scrollLeft/clientWidth/scrollWidth`を再取得する
5. `scrollLeft=0`なら左ボタン非表示・右ボタン表示になる

`activeTab`をEffect依存へ含めるだけでなく、table-container再マウント後に確実に計測されるタイミングか確認すること。
必要なら`requestAnimationFrame`等を使い、cleanupも行う。

## 必須修正3: 非表示ボタンのアクセシビリティ

非表示側は次を満たすこと。

- ポインター操作不可
- Tabフォーカス不可
- Enter/Spaceで実行不可
- 支援技術へ不要な操作要素として露出しない

`disabled`、`tabIndex`、`aria-hidden`等から適切な組み合わせを使用する。

## 必須修正4: テスト隔離

`App.matrixScroll.test.jsx`で上書きした`HTMLElement.prototype`のdescriptorを各テスト後に復元する。
後続テストの順番に依存しないこと。

## 恒久テスト

最低限、次を追加または修正する。

1. 右端状態から別タブへ移動し、ダッシュボード復帰後に左非表示・右表示へ戻る
2. 非表示ボタンがdisabledまたはTab順から除外される
3. 320pxの配置はjsdomで保証できないため、CSS breakpointの存在と実ブラウザ実測を報告
4. prototype descriptorがテスト後に復元される

## 実ブラウザ受入確認

- 320 / 375 / 768 / 769 / 1280px
- 初期状態、350px移動後、右端
- 左右ボタンの矩形重複が0px
- 両方向へ実際にクリック・タップして戻れる
- 別タブ往復後の端状態が正しい
- Cycle 5の固定列境界・日付ヘッダー・月度表示に回帰なし
- Browser console error/warnなし

## Version / Handoff

- 製品コードを変更するため`v4.25`へ更新
- Take2報告書を`docs/handoff/P3_CC_to_Dex/cycle_6_take2_report.md`へ保存
- `CURRENT_STATUS.md`を更新
- `cc-cycle6`へcommit/push
- push後のHEADを報告書とDex向けトリガーに記載
- mainへはmergeしない

## 触らない範囲

- シフト自動生成ロジック
- backend / API / DB
- 保存形式・既存データ
- Cycle 5で確定した固定列幅40pxと氏名列幅140px
