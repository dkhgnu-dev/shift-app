# CURRENT_STATUS - 友達シフト

## Dex P4 Update (Cycle 5 Take2)

- Review target: `cc-cycle5` / `1567833`
- Result: **NG - Take3差し戻し**
- Blocking finding: 1列目の実幅45pxに対し、2列目のsticky位置が`left: 40px`のため、横スクロール後に固定列同士が5px重なる
- Non-blocking finding: 現在のjsdomテストはDOM構造を保証するが、sticky位置・実幅・月度ラベル幅などCSS配置の回帰は検出しない
- Next: CC(P3)が`docs/handoff/P4_Rollback/cycle_5_take3_request.md`を読み、Take3を実装・実ブラウザ実測・pushする
- P4 review: `docs/handoff/P4_Dex_Review/cycle_5_take2_review.md`
- P5 merge: **未実施**

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: cc-cycle5（Cycle 5は作業branchで運用。P4 OK後にDexがmainへmerge）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 5 (Take2実装完了、`cc-cycle5`へpush済み -> Dex P4再レビュー待ち)
- Status: CCがTake2差戻し対応（月度ヘッダーのボタン幅修正、Freeze Panesの列指定修正、table-containerのmax-height/overflow修正、testTimeout延長、v4.22化）を実装。`npm test`を連続2回実行し17件全PASS、`node test_time_utils.mjs`(33件)・`npm run build`も成功。ただしCSS/レイアウトの修正はjsdomでは検証不能なため、実機確認は今回も未実施（セッション環境制約：別プロジェクト固定＋ポート占有）。
- Next: Dex(P4)が`cc-cycle5`のTake2を再レビューし、OKまたは差し戻しを判断する。OKならDex(P5)がmainへmergeする。**CSS/レイアウトの実機確認を強く推奨。**
- 完了報告(Take2): `docs/handoff/P3_CC_to_Dex/cycle_5_take2_report.md`
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_5_review.md`
- Take2指示: `docs/handoff/P4_Rollback/cycle_5_take2_request.md`
- 前サイクル(C4)統合記録: `docs/handoff/P5_Dex_Integration/cycle_4_p5_integration.md`

## Read First

- AGENTS.md
- docs/handoff/CURRENT_STATUS.md
- docs/PROJECT_RULES.md
- docs/handoff/WORKFLOW_RULES.md
- 完了報告(Take2): docs/handoff/P3_CC_to_Dex/cycle_5_take2_report.md

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- .env、パスワード、個人情報、本物データを扱う
