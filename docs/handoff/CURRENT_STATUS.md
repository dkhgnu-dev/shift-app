# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: cc-cycle4（Cycle 4は作業branchで運用。P4 OK後にDexがmainへmerge）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 4 (P3完了、`cc-cycle4`へpush済み -> Dex P4レビュー待ち)
- Status: CCが`INITIAL_DATA`上位3名（K.D.、N.E.、N.K.）への鍵持ち付与、「デフォルトリセット」ボタン、バージョン表記(v4.19)を実装し、`cc-cycle4`ブランチへpush済み（対象HEAD: `417b665`）。`npm test`(12件)・`node test_time_utils.mjs`(33件)・`npm run build`は全て成功。ただしこのセッションのBrowserペインが別プロジェクト設定に固定されており、レスポンシブレイアウトのブラウザ実機確認は未実施。
- Next: Dex(P4)が`cc-cycle4`をレビューし、OKまたは差し戻しを判断する。OKならDex(P5)がmainへpull --ff-only後にmergeする。
- 完了報告: `docs/handoff/P3_CC_to_Air/cycle_4_report.md`
- レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_4_review_request.md`

## Read First

- AGENTS.md
- docs/handoff/CURRENT_STATUS.md
- docs/PROJECT_RULES.md
- docs/handoff/WORKFLOW_RULES.md
- 完了報告: docs/handoff/P3_CC_to_Air/cycle_4_report.md
- 直近統合記録: docs/handoff/P5_Dex_Integration/cycle_2_3_p5_integration.md

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- .env、パスワード、個人情報、本物データを扱う
