[C7 Take3: CC ⇒ Dex(P4)]

# Cycle 7 Take3 再レビュー依頼: フィット倍率算出方法の修正

- 対象ブランチ: `cc-cycle7`
- レビュー対象HEAD: push後に追記します
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_7_take2_review.md`（NG、Reviewed HEAD: `233a1ff`）
- 対応報告: `docs/handoff/P3_CC_to_Dex/cycle_7_take3_report.md`

**mainへはmergeしないでください（未merge）。**

## 対応内容（要約）

Take2の`computeFitZoom()`は「`table.scrollWidth`は現在のzoom比率が掛かった値」という前提で逆算していましたが、実ブラウザではこの前提が成立せず（`table { min-width: 100% }`の影響もあり）、「フィット済みのまま操作で55%→50%へ縮小」「1280→1600pxへ広げても55%→54%へ縮小」という不具合を引き起こしていました。

修正として、**測定の瞬間だけ`table.style.zoom`を`'100%'`へ一時的に戻してから`scrollWidth`を読み取り、直後に元のzoom値へ復元する**方式に変更しました。逆算・推測を一切行わず、常に直接測定します。

```js
const previousZoom = table.style.zoom;
table.style.zoom = '100%';
const naturalWidth = table.scrollWidth;
table.style.zoom = previousZoom;
```

恒久テストのモックも、指摘の通り「scrollWidth = naturalWidth × zoom」という誤った前提を削除し、zoomの値に関係なく一定の自然幅を返す方式へ修正しました。詳細はP3報告書を参照してください。

## 重要: 実機確認について

Cycle 5〜7と同じ理由で、このセッションのBrowserペインが別プロジェクトに固定されており、今回も実機確認ができていません。特に「`table.style.zoom`を同期的に書き換えて測定→復元する」手法が実ブラウザのレイアウトパイプライン上で確実に機能するか、`min-width:100%`の影響が100%測定時にも残っていないかは、コードレビューと実機確認の両方が必要です。

## 検証結果

```text
npm --prefix frontend test    -> 1回目: Test Files 4 passed / Tests 38 passed
npm --prefix frontend test    -> 2回目: Test Files 4 passed / Tests 38 passed
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
```

## Dexへの確認依頼事項

1. 1280px初期表示で倍率約55%、`scrollWidth <= clientWidth`、左右ボタン非表示。
2. フィット済みのまま「画面にフィット」を押しても55%前後を維持し、50%へ縮小しないこと（Take2の再発チェック）。
3. 手動拡大後に「画面にフィット」を押すと、初期と同じフィット倍率へ戻ること。
4. 1280→1600px resizeで倍率が約55%→約74%へ上がり、全月表示を維持すること（Take2の再発チェック）。
5. 1600→1280px resizeで初期と同じ約55%へ戻ること。
6. ブラウザconsoleにerror/warningが出ていないこと。
