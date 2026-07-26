# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: cc-cycle6（Cycle 6は作業branchで運用。P4 OK後にDexがmainへmerge）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 6 (P3完了、`cc-cycle6`へpush済み -> Dex P4レビュー待ち)
- Status: CCが上部の旧スクロールボタン撤去、半透明フロート左右ボタン（グラスモフィズム）、scrollLeft連動の表示制御、v4.24化を実装。`npm test`を連続2回実行し19件全PASS、`node test_time_utils.mjs`(33件)・`npm run build`も成功。CSS/レイアウトの実機確認は今回も未実施（セッション環境制約：別プロジェクト固定）。
- Next: Dex(P4)が`cc-cycle6`をレビューし、実機で320/375/768/769/1280pxの見た目を確認する。OKならDex(P5)がmainへmergeする。
- 完了報告: `docs/handoff/P3_CC_to_Air/cycle_6_report.md`
- レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_6_review_request.md`
- 前期(C5)統合報告: `docs/handoff/P5_Dex_Integration/cycle_5_p5_integration.md`

## Read First

- AGENTS.md
- docs/handoff/CURRENT_STATUS.md
- docs/PROJECT_RULES.md
- docs/handoff/WORKFLOW_RULES.md
- 完了報告: docs/handoff/P3_CC_to_Air/cycle_6_report.md

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- .env、パスワード、個人情報、本物データを扱う
