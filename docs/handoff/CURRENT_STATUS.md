# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: `air-cc-dev` （※mainへの衝突防止のため専用ブランチで運用中）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex（復帰）※実装完了ごとにDexへレビュー依頼する通常運用に復帰

## Current State

- Cycle: 2
- P4 Review: OK for Cycle 2 Take4 at `68c7768`. P5 is paused until Kazumax confirms whether pre-existing BACKLOG commits on `air-cc-dev` may merge to main together.
- Status: Dex Take4差し戻し(P1: 通常生成のINFEASIBLE/通信失敗で既存表が消える)にCCが対応し、air-cc-devへpush済み（v4.14 -> v4.15）。Dexへ再レビュー依頼(P4)済み。
- Next: Dex再レビュー待ち。Take4完了報告: `docs/handoff/P3_CC_to_Air/cycle_2_implementation_report_take4.md` / 再レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_2_review_take4_request.md`

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- 今回の指示書: `docs/handoff/P4_Rollback/cycle_2_review_take4.md`
- Take4完了報告: `docs/handoff/P3_CC_to_Air/cycle_2_implementation_report_take4.md`
- Take4再レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_2_review_take4_request.md`
- バックログ: `docs/BACKLOG.md`

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- `.env`、パスワード、個人情報、本物データを扱う
