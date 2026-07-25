# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: cc-cycle5（Cycle 5は作業branchで運用。P4 OK後にDexがmainへmerge）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 5 (P3完了、`cc-cycle5`へpush済み -> Dex P4レビュー待ち)
- Status: CCが月度ヘッダーの1行化、スマホ単日カードビュー廃止＆マトリクス統合、Freeze Panes(sticky)のz-index整理、左右スクロールボタン、v4.21化を実装。`npm test`(16件)・`node test_time_utils.mjs`(33件)・`npm run build`は全て成功。レスポンシブレイアウト・sticky実機・スクロール動作の実機確認は今回も未実施（セッション環境制約）。
- Next: Dex(P4)が`cc-cycle5`をレビューし、OKまたは差し戻しを判断する。OKならDex(P5)がmainへmergeする。
- 完了報告: `docs/handoff/P3_CC_to_Air/cycle_5_report.md`
- レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_5_review_request.md`
- 前サイクル(C4)統合記録: `docs/handoff/P5_Dex_Integration/cycle_4_p5_integration.md`

## Read First

- AGENTS.md
- docs/handoff/CURRENT_STATUS.md
- docs/PROJECT_RULES.md
- docs/handoff/WORKFLOW_RULES.md
- 完了報告: docs/handoff/P3_CC_to_Air/cycle_5_report.md

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- .env、パスワード、個人情報、本物データを扱う
