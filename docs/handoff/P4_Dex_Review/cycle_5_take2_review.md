# Cycle 5 Take2 Dex P4 Review

## 判定

**NG - Take3差し戻し**

Take1で指摘した月度表示消失、氏名列未固定、日付ヘッダー未固定、テストタイムアウトは解消した。
ただし、横スクロール時に固定1列目と固定2列目が5px重なるため、mainへのmergeは行わない。

## Review Target

- Branch: `cc-cycle5`
- Requested HEAD: `1567833`
- Implementation commit: `0f522cf`
- Compared from: `f86a626`
- Version: `v4.22`

## Findings

### P2: 固定1列目と氏名列が5px重なる

対象: `frontend/src/index.css`

共通の`th, td`に`min-width: 45px`が指定されているため、1列目は実ブラウザ上で45px幅になる。
一方、2列目は`left: 40px`でsticky固定されている。

320px幅で右へ350pxスクロールした実測:

- 1列目: `x=34px`から`79px`、幅45px
- 2列目: `x=74px`から`214px`、幅140px
- 重複: `74px`から`79px`の5px

1列目を40pxへ厳密固定するか、2列目の`left`を実幅45pxへ合わせ、両者の境界を一致させる必要がある。

### P3: 恒久テストの保証範囲がCSS配置まで届いていない

対象: `frontend/src/App.matrixScroll.test.jsx`

追加テストは「2列目に氏名が存在するDOM構造」を確認している。
sticky、left offset、実幅、月度ラベルの表示幅はjsdomでは検証できないため、Take1のCSS不具合へ戻ってもこのテストは通る。

今回はDexの実ブラウザ確認で補完できたため、これはTake3の必須ブロッカーにはしない。
ただし、テスト名・コメントを実際の保証範囲に合わせ、将来はPlaywright等のブラウザテスト導入を検討すること。

## 解消を確認した項目

- 320 / 375 / 768 / 769 / 1280pxで月度ラベルが表示される
- 月度ラベル実幅はスマホ約167px、PC約206px
- 左右ボタンでコンテナが350px横移動する
- 横スクロール後も1列目と氏名列が画面内に残る
- コンテナ内縦スクロール後も日付ヘッダーが上端に残る
- `.table-container`は`max-height: 70vh; overflow: auto`
- 固定セル背景は不透明
- 769pxと1280pxのPC表示に崩れなし
- 320pxの従業員管理画面に横あふれなし
- 769pxのルール設定画面に横あふれなし
- ブラウザconsole error/warnなし
- solver / backend変更なし

## Automated Verification

- `npm --prefix frontend test` 1回目: 17/17 PASS
- `npm --prefix frontend test` 2回目: 17/17 PASS
- `node frontend/test_time_utils.mjs`: 33/33 PASS
- `npm --prefix frontend run build`: PASS

## Crew Decision

サブレビュー利用判断: **使用**

理由: Cycle 5はレスポンシブ境界、二方向sticky、既存画面へのCSS波及が絡むため、Dex本体の実ブラウザ検証と独立した差分監査を並行実施した。
デクスクルーも同じ5px重複を独立再現し、判定は一致した。

## Kazumax確認レベル

**今回はKazumaxによる手動確認は不要。**

理由: Take3で直すべき位置と再現数値が確定しており、現段階で触ってもらってもmerge可能にはならないため。
Take3のP4 OK後、最終的な操作感だけを必要箇所に絞って案内する。
