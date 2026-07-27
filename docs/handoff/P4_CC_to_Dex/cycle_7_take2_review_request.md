[C7 Take2: CC ⇒ Dex(P4)]

# Cycle 7 Take2 再レビュー依頼: 実寸フィット・アクセシビリティ・スマホドラッグ無効化

- 対象ブランチ: `cc-cycle7`
- レビュー対象HEAD: push後に追記します
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_7_review.md`（NG、Reviewed HEAD: `a63ce06`）
- 対応報告: `docs/handoff/P3_CC_to_Dex/cycle_7_take2_report.md`

**mainへはmergeしないでください（未merge）。**

## 対応内容（要約）

1. `computeFitZoom()`を新設。`table.scrollWidth`を現在のzoom比率で逆算して実寸幅を求め、コンテナ幅に収まる倍率を計算するようにした（単純な`setZoomLevel(100)`ではない）。ボタン名を「画面にフィット」に変更。初期表示・resize・タブ復帰・データ変更後に自動再計算するエフェクトを追加。
2. 氏名セルに`role="button"` `tabIndex={0}`、Enter/Spaceキー対応を追加。詳細ダイアログに`role="dialog"` `aria-modal="true"` `aria-labelledby`を付与し、開いた直後に閉じるボタンへフォーカス、閉じた後は起動元（氏名セル）へフォーカスを戻す。右上Xを実`<button aria-label="閉じる">`に変更。Escapeキー対応も追加。
3. ダッシュボードの行`draggable`を`!isMobileView`条件にし、スマホ（768px以下）では行ドラッグを無効化。

詳細はP3報告書を参照してください。

## 重要: 実機確認について

Cycle 5〜7と同じ理由で、このセッションのBrowserペインが別プロジェクトに固定されており、今回も実機確認ができていません。特に「実寸フィットの実際の見た目」「769pxでのコントロールのはみ出し有無」「resize/タブ往復時の挙動」「スマホでの氏名タップ・横スクロールの操作感」は、コードの計算根拠とコンポーネントテストのみでの対応です。Dexまたはkazumax側での実機確認を強くお願いします。

## 検証結果

```text
npm --prefix frontend test    -> 1回目: Test Files 4 passed / Tests 36 passed
npm --prefix frontend test    -> 2回目: Test Files 4 passed / Tests 36 passed
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
```

## Dexへの確認依頼事項

1. 1280pxの初期表示で全月が実際にコンテナへ収まり、左右フロートボタンが非表示になっているか。
2. 拡大後に「画面にフィット」を押すと、実際に適切な倍率へ戻るか（単純な100%リセットになっていないか）。
3. 769pxでズームコントロールが画面外へはみ出していないか。
4. 氏名セル・詳細ダイアログの実機でのTab/Enter/Space/Escapeキー操作、フォーカスの見た目。
5. スマホ（320/375/768px）で行のドラッグが実際に発生せず、氏名タップと横スワイプが快適に行えるか。
6. ブラウザconsoleにerror/warningが出ていないか。
