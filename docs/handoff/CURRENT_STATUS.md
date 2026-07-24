# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: `air-cc-dev` （※mainへの衝突防止のため専用ブランチで運用中）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex（復帰）※実装完了ごとにDexへレビュー依頼する通常運用に復帰

## Current State

- Cycle: 2
- Status: Kazumaxの仕様判断（希望休一本化・有休の連勤ハイブリッドルール）確定後、CCがTake2修正を完了しair-cc-devへpush済み（v4.12 -> v4.13）。Dexへ再レビュー依頼(P4)済み。
- Next: Dex再レビュー待ち。Take2完了報告: `docs/handoff/P3_CC_to_Air/cycle_2_implementation_report_take2.md` / 再レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_2_review_take2_request.md`

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- 今回の指示書: `docs/handoff/P4_Rollback/cycle_2_review_take2.md`
- Take2完了報告: `docs/handoff/P3_CC_to_Air/cycle_2_implementation_report_take2.md`
- Take2再レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_2_review_take2_request.md`
- バックログ: `docs/BACKLOG.md`

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- `.env`、パスワード、個人情報、本物データを扱う
