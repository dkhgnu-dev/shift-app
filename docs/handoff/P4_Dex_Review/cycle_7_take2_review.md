# Cycle 7 Take2 P4再レビュー

## 判定

**P4 NG。Take3差し戻し。main統合不可。**

前回のアクセシビリティとスマホドラッグ無効化は解消しました。しかし「画面にフィット」の計算が実ブラウザのCSS zoom挙動と一致せず、フィット済み画面やresize後に誤った倍率へ縮小します。

## レビュー対象

- Branch: `cc-cycle7`
- Target HEAD: `233a1ffee35e5a3d0c4e6cc922f894ff87283738`
- Implementation commit: `435466a`
- Base: `d193a3b`
- `435466a..233a1ff`: handoff内のpush済みHEAD表記更新のみ

## Finding

### [P1] フィット計算が実ブラウザの`table.scrollWidth`を誤解している

- 該当: `frontend/src/App.jsx:354-369`
- 実装は「`table.scrollWidth`は現在のCSS zoom適用後の値」という前提で、`zoomLevel / 100`で除算しています。
- Chromium実測では、`table.scrollWidth`は見た目のzoom後幅ではなく、レイアウト上の未縮小幅を返します。
- さらにテーブルの`min-width: 100%`により、縮小後にコンテナが広がると`table.scrollWidth`自体がコンテナを満たすよう拡張されます。

実機で次を再現しました。

1. 1280px初期表示:
   - コンテナ: 930px
   - 表示倍率: 55%
   - コンテナscrollWidth: 930px
   - 全月表示: 成立
2. そのまま「画面にフィット」:
   - 55%から50%へ不必要に縮小
3. 1280pxから1600pxへ画面を拡張:
   - コンテナ: 930px -> 1250px
   - 倍率: 55% -> 54%
   - 画面が広くなったのに表がさらに小さくなる

1600pxでは自然幅約1680pxに対して約74%まで拡大しても収まるため、54%は適切なフィット倍率ではありません。

### テストが検出できない理由

- 該当: `frontend/src/App.cycle7.test.jsx:14-50`
- モックが`scrollWidth = naturalWidth * zoom`を返しています。
- これは実ブラウザの挙動と異なり、製品コードと同じ誤った前提をテスト側でも再現しています。
- resize後に「画面が広がれば倍率も上がる」ケースもありません。

## 前回指摘の再確認

### 解消: 氏名セル・詳細ダイアログ

- 氏名セルは`role=button`、`tabIndex=0`
- Enter / Spaceで開く
- ダイアログは`role=dialog`、`aria-modal=true`、`aria-labelledby`
- 開いた直後は右上の閉じるボタンへフォーカス
- Escape / 閉じるボタンで閉じる
- 閉じた後は起動元の氏名セルへフォーカス復帰

実ブラウザですべて確認しました。

### 解消: スマホ行ドラッグ

- 320 / 375 / 768px: `draggable=false`
- 769 / 1280px: `draggable=true`
- 320pxで氏名タップ1回、横スクロール`0 -> 380`を確認

## その他の実ブラウザ確認

- 320 / 375 / 768px:
  - 氏名列105px
  - 氏名列と先頭日付列の境界差0px
  - ドラッグ列非表示
  - フロートボタン非表示
- 769px:
  - ズームコントロール右端722pxで画面内
  - 50%表示、PC行ドラッグ有効
- 1280px:
  - 初期55%では全月表示自体は成立
  - 左右フロートボタンは無効・非表示
- Version: v4.27
- ブラウザconsole warning/error: 0件

## 自動検証

- `npm.cmd --prefix frontend test`: 36/36 PASS
- `node frontend/test_time_utils.mjs`: 33/33 PASS
- `npm.cmd --prefix frontend run build`: PASS
- `git diff --check`: PASS

## デクスクルー補助レビュー

使用しました。前回3件の静的解消、resize経路、テスト妥当性、範囲外変更を確認させました。

- 採用: resize時に最新状態を正しく扱えない懸念
- Dex本体の実ブラウザ確認で、より根本的な`scrollWidth`前提誤りと55% -> 50%、55% -> 54%の実害を確定
- 解消判断を採用: アクセシビリティ、スマホ`draggable`
- 範囲外変更なし

最終NG判定はDex本体が行いました。

## Kazumax確認レベル

**確認不要**

AI側の実機計測で不具合を再現できており、Kazumaxへ確認をお願いする段階ではありません。

