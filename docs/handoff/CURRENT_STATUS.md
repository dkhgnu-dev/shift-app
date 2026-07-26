# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: cc-cycle6（Cycle 6は作業branchで運用。P4 OK後にDexがmainへmerge）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 6 (Take2実装完了、`cc-cycle6`へpush済み -> Dex P4再レビュー待ち)
- Status: CCが左右ボタンの動的クランプ配置（重複ゼロ）、タブ復帰時の再計算、disabled/aria-hiddenによるアクセシビリティ対応、テストのprototype復元修正、v4.25化を実装。`npm test`を連続2回実行し21件全PASS、`node test_time_utils.mjs`(33件)・`npm run build`も成功。実ブラウザでの座標実測は今回も未実施（セッション環境制約：別プロジェクト固定）。
- Next: Dex(P4)が`cc-cycle6`のTake2をレビューし、実機で320/375/768/769/1280pxの座標を確認する。OKならDex(P5)がmainへmergeする（**main未merge**）。
- 完了報告(Take2): `docs/handoff/P3_CC_to_Dex/cycle_6_take2_report.md`
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_6_review.md`
- Take2指示: `docs/handoff/P4_Rollback/cycle_6_take2_request.md`
- 前期(C5)統合報告: `docs/handoff/P5_Dex_Integration/cycle_5_p5_integration.md`

## Read First

- AGENTS.md
- docs/handoff/CURRENT_STATUS.md
- docs/PROJECT_RULES.md
- docs/handoff/WORKFLOW_RULES.md
- 完了報告(Take2): docs/handoff/P3_CC_to_Dex/cycle_6_take2_report.md

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- .env、パスワード、個人情報、本物データを扱う
