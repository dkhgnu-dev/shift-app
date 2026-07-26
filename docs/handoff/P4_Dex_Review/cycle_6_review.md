# Cycle 6 Dex P4 Review

## 判定

**P4 NG - Take2差し戻し**

自動テストとbuildは成功し、375 / 768 / 769 / 1280pxの基本配置にもブロッカーはなかった。
ただし320pxで左右ボタンが重なって左ボタンを操作できず、タブ復帰後には表示状態が古いまま残る。
mainへはmergeしない。

## Review Target

- Branch: `cc-cycle6`
- Requested HEAD: `bdc4d5a`
- Implementation commit: `8e727c0`
- Documentation follow-up: `bdc4d5a`
- Compared from: `b1c842b`
- Version: `v4.24`

`8e727c0..bdc4d5a`はhandoffの対象HEAD追記だけで、製品コード変更はない。

## Findings

### P1: 320pxで左右ボタンが37px重なり、左へ戻れない

対象: `frontend/src/index.css`

320px時のwrapper実幅は239px。

- 左ボタン: `x=221..261`、40px
- 右ボタン: `x=224..264`、40px
- 重複: 37px

左端では左ボタンが透明なので右ボタンだけ見えるが、右へ1回動かすと両方が表示される。
同じz-indexで右ボタンがDOM後方にあるため、重なった中心をタップすると右ボタンが反応する。
実機では`scrollLeft=350`から左へ戻そうとしたタップで`700`へ進み、左ボタンが実質操作不能だった。

狭幅では左右を固定pxで置かず、互いに重ならない配置へ変更する必要がある。

### P1: 別タブからダッシュボードへ戻ると端状態が古い

対象: `frontend/src/App.jsx`

右端まで移動して従業員管理へ移動し、ダッシュボードへ戻ると、新しいtable-containerは`scrollLeft=0`になる。
しかし再計算Effectが`activeTab`を監視していないため、stateは右端時のまま残った。

実測:

- table-container: `scrollLeft=0`
- 左ボタン: `opacity=1`, `pointer-events=auto`
- 右ボタン: `opacity=0`, `pointer-events=none`

この状態では右へ進むボタンが表示されず、マウス・タップ操作で横移動を開始できない。

### P2: 透明なボタンがキーボード操作可能

対象: `frontend/src/App.jsx`

非表示制御は`opacity:0`と`pointer-events:none`だけで、button自体は`disabled=false`、`tabIndex=0`、`aria-hidden`なし。
Tabキーで透明ボタンへフォーカスでき、Enter/Spaceで実行できる。

非表示時は`disabled`または`tabIndex=-1`等を連動し、見えない操作要素をフォーカス順から除外すること。

### P3: テストのprototype上書きが後続テストへ残る

対象: `frontend/src/App.matrixScroll.test.jsx`

`Object.defineProperty`で`HTMLElement.prototype`の`clientWidth`、`scrollWidth`、`scrollLeft`を変更している。
`vi.restoreAllMocks()`ではdescriptorは復元されないため、後から追加されるテストへ寸法値が漏れる。

元descriptorを保存・復元するか、復元可能なgetter spy等を使用すること。

## Passed Checks

- 旧`.matrix-scroll-nav`と文字入りボタン撤去: PASS
- v4.24 PC / mobile: PASS
- wrapperとtable-containerの構造: PASS
- 375 / 768 / 769 / 1280pxで左右ボタンの重なりなし
- 5幅すべてでCycle 5固定列境界差0px
- 5幅すべてで縦スクロール後の日付ヘッダー固定
- 左端で左pointer無効、右端で右pointer無効
- resize listener cleanupの実装あり
- Browser console error/warn: 0件
- solver / backend / DB / 保存処理への変更なし

## Automated Verification

- `npm --prefix frontend test` 1回目: 19/19 PASS
- `npm --prefix frontend test` 2回目: 19/19 PASS
- `node frontend/test_time_utils.mjs`: 33/33 PASS
- `npm --prefix frontend run build`: PASS

## Crew Review

サブレビュー利用判断: **使用**

理由: フロート配置の実機確認と並行して、デクスクルーにEffect依存、端状態、アクセシビリティ、テスト隔離を独立監査させた。
タブ復帰バグ、透明ボタンのキーボード操作、prototype未復元の3件を採用した。
320pxのボタン重複はDex実機確認で追加採用した。

## Kazumax確認レベル

**確認不要**

Take2で直すべき再現条件が確定しているため、現段階でKazumaxが触る必要はない。
Take2のP4後、操作感に人間判断が必要な箇所だけ再判定する。
