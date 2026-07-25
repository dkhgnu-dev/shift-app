[C5: CC ⇒ Dex(P4)]

# Cycle 5 レビュー依頼: マトリクス表の固定＆左右スクロールボタン & スマホカレンダー統合

- 対象ブランチ: `cc-cycle5`
- レビュー対象HEAD: push後に追記します
- 対応指示: `docs/handoff/P2_AirCrew_to_CC/cycle_5_matrix_scroll_and_mobile_calendar_instructions.md`
- 対応報告: `docs/handoff/P3_CC_to_Air/cycle_5_report.md`

## 対応内容（要約）

1. 月度ヘッダー（`.month-header`系クラス）を新設し、狭幅でも1行表示を維持（旧`.header`の`flex-direction: column`が3段崩れの原因だったため、`.month-header`で上書き）。
2. ダッシュボードの「📱/💻」ビュー切替トグルと単日カードビューを完全削除。マトリクス表（全従業員×全日程）を常時表示に一本化。未使用になった`selectedDateIndex`stateも削除。
3. 既存のsticky(Freeze Panes)実装のz-indexを20(上部行)/30(氏名列)/40(左上角)に整理。
4. `tableContainerRef`＋`scrollTableBy()`による左右スクロールボタンを新設。
5. バージョン表記を`v4.20`→`v4.21`に更新。

## branch運用について

`cc-cycle4`と同様、`manuals/WORKFLOW_RULES.md`の「重要な実装や大きな変更ではmainへ直接pushせず作業branchを作ってからmergeする」に従い、`cc-cycle5`ブランチで作業しています。P4 OKの場合は、Dex(P5)が`main`を`git pull --ff-only`で最新化してからmergeしてください。

## 検証結果

- `npm --prefix frontend test`（vitest run）: 16件全てPASS（既存13件 + 新規`App.matrixScroll.test.jsx` 3件）
- `node frontend/test_time_utils.mjs`: 33件全てPASS
- `npm --prefix frontend run build`: 成功
- ブラウザ実機確認: **未実施**（Cycle4までと同じセッション環境制約により継続して不可）

## Dexへの確認依頼事項

1. 月度ヘッダーの1行化CSS（`.month-header`系）が、他タブの`.header`挙動（設定・従業員管理タブの縦積みレイアウト）に意図せず影響していないか。
2. マトリクス表への一本化（スマホ単日カードビュー廃止）により、`isMobileView`state自体は残しつつ従業員管理タブ等の既存挙動は変更していないことの確認。
3. Freeze Panes（sticky）のz-index整理とスクロールボタンの実装が、指示書の意図通りか。
4. レスポンシブ・sticky・スクロール動作の実機確認（320/375/768/769px以上）を、可能であればDexまたはKazumax側でお願いできるか。
