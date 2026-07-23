# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: `air-cc-dev` （※mainへの衝突防止のため専用ブランチで運用中）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex（復帰）※実装完了ごとにDexへレビュー依頼する通常運用に復帰

## Current State

- Cycle: 2
- Status: DexがCycle 2 P4レビューを完了し、Take2差し戻し。固定セルを壊すINFEASIBLEフォールバックとTimePickerの24:00不具合がBlocker。
- Next: Kazumaxが希望休との優先順位・特殊シフトの連勤扱いを判断後、CCがTake2修正。差し戻し: `docs/handoff/P4_Rollback/cycle_2_review_take2.md`

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- 今回の指示書: `docs/handoff/P2_AirCrew_to_CC/cycle_2_hybrid_and_shift_features_instructions.md`
- Cycle 2完了報告（既知の制限事項含む）: `docs/handoff/P3_CC_to_Air/cycle_2_implementation_report.md`
- Cycle 2 P4差し戻し: `docs/handoff/P4_Rollback/cycle_2_review_take2.md`
- バックログ: `docs/BACKLOG.md`

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- `.env`、パスワード、個人情報、本物データを扱う
