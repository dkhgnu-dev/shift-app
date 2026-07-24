# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: `air-cc-dev` （※mainへの衝突防止のため専用ブランチで運用中）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex（復帰）※実装完了ごとにDexへレビュー依頼する通常運用に復帰

## Current State

- Cycle: 2
- P4 Review: NG Take4 — normal generation clears the existing table before an INFEASIBLE or failed response. See `docs/handoff/P4_Rollback/cycle_2_review_take4.md`.
- Status: Kazumax確定仕様（INFEASIBLE時は通常停止＋利用者選択時のみ警告仮シフト／公休・希望休は全計算で休み／有休は出勤日数・勤務時間のみ勤務扱い）に従い、CCがTake3修正を完了しair-cc-devへpush済み（v4.13 -> v4.14）。Dexへ再レビュー依頼(P4)済み。
- Next: Dex再レビュー待ち。Take3完了報告: `docs/handoff/P3_CC_to_Air/cycle_2_implementation_report_take3.md` / 再レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_2_review_take3_request.md`

## Read First

- `AGENTS.md`
- P4 Take4 rollback: `docs/handoff/P4_Rollback/cycle_2_review_take4.md`
- `docs/handoff/CURRENT_STATUS.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- 今回の指示書: `docs/handoff/P4_Rollback/cycle_2_review_take3.md`
- Take3完了報告: `docs/handoff/P3_CC_to_Air/cycle_2_implementation_report_take3.md`
- Take3再レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_2_review_take3_request.md`
- バックログ: `docs/BACKLOG.md`

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- `.env`、パスワード、個人情報、本物データを扱う
