[C5 Take3: CC ⇒ Dex(P4)]

# Cycle 5 Take3 再レビュー依頼: 固定列の5px重複解消

- 対象ブランチ: `cc-cycle5`
- レビュー対象HEAD: `56bff20`（push済み、`1df48c5..56bff20`）
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_5_take2_review.md`（NG、Take3差戻し `1df48c5`）
- 対応報告: `docs/handoff/P3_CC_to_Dex/cycle_5_take3_report.md`

**mainへはmergeしないでください（未merge）。**

## 対応内容（要約）

1列目（ドラッグハンドル列）が全セル共通の`min-width: 45px`の影響で実幅45pxになっており、2列目（氏名列）の`left: 40px`との間で5px重複していました。`frontend/src/index.css`の`td:nth-child(1), th:nth-child(1)`ルールに`width: 40px; min-width: 40px; max-width: 40px;`を追加し、1列目を厳密に40pxへ固定しました（差戻し指示書の推奨案1）。

バージョンを`v4.22`→`v4.23`に更新しました。

## 重要: 実機での座標実測ができていません

このセッションのBrowserペインが別プロジェクト（`シフト`）に固定されていることを確認しました。`友達シフト`の`.claude/launch.json`は`port: 5173`を指定していますが、実際には別プロジェクト向けに以前設定した`port: 5174`の構成が起動してしまい、設定名を指定しても`友達シフト`側の設定が一切読まれません。これはセッション側の制約で、設定変更では解決できませんでした。

Kazumaxに相談し、**「コード修正とCSS仕様上の計算根拠のみでTake3をpushし、実機での座標確認はDexまたはKazumax側にお願いする」**方針の承認を得ています。そのため、以下は**未実施**です。

- 320/375/768/769/1280pxでの実際の境界座標実測（1列目右端と2列目左端の一致確認）
- 縦スクロール時の日付ヘッダー固定、月度ラベル全幅表示、固定セル背景の不透明性（Take2で対応済みのはずですが再確認できていません）
- 従業員管理・ルール設定タブの320px/769pxでの表示崩れ確認
- ブラウザconsoleのerror/warning確認

CSS仕様上の根拠（`box-sizing: border-box`前提で、1列目の実幅40pxと2列目の`left:40px`が理論上一致する）は報告書に記載していますが、実機での確認に代わるものではありません。

## 検証結果

```text
npm --prefix frontend test    -> 1回目: Test Files 3 passed / Tests 17 passed
npm --prefix frontend test    -> 2回目: Test Files 3 passed / Tests 17 passed
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
```

## Dexへの確認依頼事項

1. 320/375/768/769/1280pxで、横スクロール後に1列目の右端と2列目の左端が座標として完全一致するか（重複・隙間なし）。
2. Take2で対応済みの項目（縦スクロール時の日付ヘッダー固定、月度ラベル全幅表示、固定セル不透明背景）が引き続き問題ないか。
3. 従業員管理・ルール設定タブの320px/769pxでの表示崩れがないか（今回このタブには触れていません）。
4. ブラウザconsoleにerror/warningが出ていないか。
