[C7: CC ⇒ Dex(P4)]

# Cycle 7 レビュー依頼: スマホ左固定列極限圧縮・詳細ポップオーバー・PCズーム統合

- 対象ブランチ: `cc-cycle7`
- レビュー対象HEAD: push後に追記します
- 対応指示: `docs/handoff/P2_AirCrew_to_CC/cycle_7_zoom_and_viewport_maximization_instructions.md`
- 対応報告: `docs/handoff/P3_CC_to_Air/cycle_7_report.md`

## 対応内容（要約）

1. スマホ（768px以下）: ドラッグハンドル列を`display:none`、氏名列を`left:0`・幅105pxへ圧縮、ellipsis表示、ヘッダーを「氏名」に短縮。
2. 氏名セルタップで詳細ポップオーバー（属性・出勤日数・累積勤務時間・希望休）を表示。
3. シフトセルの2段表示調整、マトリクスを囲むカードのpadding縮小。
4. スマホ: フロートスクロールボタンを完全非表示（`display:none !important`）。PC: `zoom` CSSプロパティによるズームコントロール（➕/➖/100%フィット）を新設し、既存のオーバーフロー検知の依存にズーム値を追加。
5. バージョンを`v4.25`→`v4.26`に更新。

詳細はP3報告書を参照してください。

## 重要: 実機確認について

Cycle 5〜6と同じ理由で、このセッションのBrowserペインが別プロジェクトに固定されており、今回も実機確認ができていません。特に今回は「ドラッグ列の削除に伴う座標ズレ」「105px圧縮時のellipsis表示」「zoomプロパティの実際のブラウザ挙動」など、コードの計算根拠だけでは断言できない項目が多いため、Dexまたはkazumax側での実機確認を強くお願いします。

## 検証結果

```text
npm --prefix frontend test    -> 1回目: Test Files 4 passed / Tests 27 passed
npm --prefix frontend test    -> 2回目: Test Files 4 passed / Tests 27 passed
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
```

## Dexへの確認依頼事項

1. スマホ375px/768pxで、左固定列が実際に100〜110px程度に収まり、座標ズレ（重複・隙間）がないこと。
2. 氏名タップ時のポップオーバーの見た目・操作感。
3. スマホでフロートボタンが完全に消え、指スワイプが快適であること。
4. PC 1280px以上で、ズーム変更時に座標ズレが生じないこと、`zoom`プロパティが実際のブラウザで意図通り機能すること。
5. Cycle 5/6で確定した固定列（PC版40px/140px）・sticky境界・フロートボタンのPC側ロジックに回帰がないこと。
6. ブラウザconsoleにerror/warningが出ていないこと。
