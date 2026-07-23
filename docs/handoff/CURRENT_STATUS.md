# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: `air-cc-dev` （※mainへの衝突防止のため専用ブランチで運用中）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: エアクルー (Air Crew) ※Dex制限中の代用

## Current State

- Cycle: 2
- Status: CCがCycle 2実装(P3)完了・`air-cc-dev` ブランチへpush済み（version v4.11 -> v4.12）。ローカルbackend/frontendでのブラウザ実機検証済み。
- Next: Air/エアクルーによるレビュー。必要ならKazumax・友達に実機確認を依頼（有休等の既定8h、鍵持ち開閉店判定ロジックの妥当性）。完了報告: `docs/handoff/P3_CC_to_Air/cycle_2_implementation_report.md`

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- 今回の指示書: `docs/handoff/P2_AirCrew_to_CC/cycle_2_hybrid_and_shift_features_instructions.md`
- Cycle 2完了報告（既知の制限事項含む）: `docs/handoff/P3_CC_to_Air/cycle_2_implementation_report.md`
- バックログ: `docs/BACKLOG.md`

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- `.env`、パスワード、個人情報、本物データを扱う
