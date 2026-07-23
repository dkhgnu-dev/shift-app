# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: `air-cc-dev` （※mainへの衝突防止のため専用ブランチで運用中）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: エアクルー (Air Crew) ※Dex制限中の代用

## Current State

- Cycle: 1
- Status: `air-cc-dev` ブランチを作成し、`docs/BACKLOG.md` およびCycle 1 P1/P2仕様をpush完了。CC向けの実装指示待ち
- Next: CCが `air-cc-dev` ブランチ上で `docs/handoff/P2_AirCrew_to_CC/cycle_1_mobile_and_flexible_shifts_instructions.md` に従って実装(P3)・プッシュを行う

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- 今回の指示書: `docs/handoff/P2_AirCrew_to_CC/cycle_1_mobile_and_flexible_shifts_instructions.md`
- バックログ: `docs/BACKLOG.md`

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- `.env`、パスワード、個人情報、本物データを扱う
