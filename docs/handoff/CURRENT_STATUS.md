# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: `air-cc-dev` （※mainへの衝突防止のため専用ブランチで運用中）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex（復帰）※実装完了ごとにDexへレビュー依頼する通常運用

## Current State

- Cycle: 2
- P4 Review: NG for UI enhancements at `99af37d`（Take1）。Take2で4桁直接入力（`0930`->`09:30`、`1500`->`15:00`）を実装済み。
- Status: CCがTimePickerの4桁直接入力（Take2）を実装。`node test_time_utils.mjs`とビルドは成功。**未commit/未push**（このセッションのBrowserペインが別プロジェクトのdevサーバー設定に固定され実機確認ができなかったため、Dex/Kazumax確認を経てからpushする方針）。
- Next: Dexへ再レビュー依頼済み（実機未確認の旨を明記）。Dex/Kazumaxの確認後、commit・pushしてCURRENT_STATUSを更新する。
- 完了報告(Take2): `docs/handoff/P3_CC_to_Air/cycle_2_ui_enhancements_take2_report.md` / レビュー依頼(Take2): `docs/handoff/P4_CC_to_Dex/cycle_2_ui_enhancements_take2_review_request.md`

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- 今回の指示書: `docs/handoff/P4_Rollback/cycle_2_ui_enhancements_review.md`（Take2必須修正）
- 完了報告(Take2): `docs/handoff/P3_CC_to_Air/cycle_2_ui_enhancements_take2_report.md`
- レビュー依頼(Take2): `docs/handoff/P4_CC_to_Dex/cycle_2_ui_enhancements_take2_review_request.md`
- バックログ: `docs/BACKLOG.md`

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- `.env`、パスワード、個人情報、本物データを扱う
