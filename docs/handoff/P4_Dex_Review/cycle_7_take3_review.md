# Cycle 7 Take3 P4再レビュー

## 判定

**P4 NG。Take4差し戻し。main統合不可。**

通常系のフィット動作は実ブラウザですべて合格しました。ただし、測定のため一時変更する`table.style.zoom`の復元が例外時に保証されず、恒久テストも今回の核心である「100%で測定したこと」を検証できていません。

## レビュー対象

- Branch: `cc-cycle7`
- Target HEAD: `4e67e31b36a7410967a17f3c43558bbb3cbc75d9`
- Implementation commit: `6802e0f`
- Base: `b1a993e`
- `6802e0f..4e67e31`: handoff内のpush済みHEAD表記更新のみ

## Findings

### [P2] 一時的なzoom変更が例外時に復元されない

- 該当: `frontend/src/App.jsx:365-370`
- 現在は次の順で直接変更しています。

```js
table.style.zoom = '100%';
const naturalWidth = table.scrollWidth;
table.style.zoom = previousZoom;
```

`scrollWidth`取得や今後追加される測定処理が例外を投げると、最後の復元へ到達せず、表だけ100%表示のまま残ります。React stateの倍率表示と実際の表倍率も食い違います。

一時的なDOM変更は`try/finally`で必ず復元し、測定に失敗した場合は倍率stateを更新せず現在表示を維持してください。

### [P2] 恒久テストが「100%での直接測定」を検証していない

- 該当: `frontend/src/App.cycle7.test.jsx:14-47`
- モックはzoomに関係なく一定の`scrollWidth`を返します。
- そのため、製品コードから`table.style.zoom = '100%'`を削除してもテストが通ります。
- 今回直した核心処理と例外時復元を、恒久テストが守れていません。

必要なテスト:

1. `scrollWidth`を読む瞬間に`table.style.zoom === '100%'`
2. 通常測定後に元のzoomへ復元
3. getterが例外を投げても元のzoomへ復元
4. 測定失敗時に表示倍率stateを変更しない
5. descriptorが例外経路でも復元

## 通常系の実ブラウザ結果

### 1280px

- 初期フィット: 55%
- コンテナ: 930px
- 全月右端: コンテナ内
- 左右フロートボタン: 無効・非表示
- フィット済みで再度「画面にフィット」: 55%を維持
- 65%へ拡大: オーバーフロー発生、右ボタン有効
- 65%から「画面にフィット」: 55%へ復帰

### resize往復

- 1280px: 55%
- 1600px: 74%
- 1280pxへ戻す: 55%
- 全状態で全月表示と左右ボタン非表示を維持

### 指定5幅

- 320 / 375 / 768px:
  - 氏名列105px
  - 日付列との境界差0px
  - ドラッグ列非表示
  - 行`draggable=false`
  - フロートボタン非表示
- 769px:
  - コントロール右端722pxで画面内
  - 50%表示
  - 行`draggable=true`
- 1280px:
  - 55%で全月表示

### その他

- Version: v4.28
- ブラウザconsole warning/error: 0件
- ちらつき: 通常操作とresize往復で目立つ描画なし

## 自動検証

- `npm.cmd --prefix frontend test`: 38/38 PASS
- `node frontend/test_time_utils.mjs`: 33/33 PASS
- `npm.cmd --prefix frontend run build`: PASS
- `git diff --check`: PASS

## デクスクルー補助レビュー

使用しました。測定処理の静的安全性、テスト妥当性、resize経路、範囲外変更を確認させました。

- 採用: `try/finally`復元不足
- 採用: テストが100%測定と例外経路を捕捉しない
- 解消判断を採用: 通常系resize計算、古い倍率参照問題
- 範囲外変更なし

Dex本体の実ブラウザ確認でも通常系は合格しましたが、例外経路を未保護のままmainへ統合しないと判断しました。

## Kazumax確認レベル

**確認不要**

Take4は内部的な復元保証と恒久テストの硬化であり、Kazumaxの見た目判断は不要です。

