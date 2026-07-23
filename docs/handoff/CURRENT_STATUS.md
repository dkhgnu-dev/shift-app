# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Main agent: アイ単体
- External reviewer: Kazumax側Dex（必要時）

## Current State

- Cycle: 1
- Status: アグ向け途中棚卸依頼をGitHubへ共有済み
- Next: アグが `docs/handoff/kazumax_to_agu_cycle1_inventory_request.md` を読み、現状棚卸を行う

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `docs/PROJECT_RULES.md`
- 必要に応じて `docs/handoff/WORKFLOW_RULES.md`
- 今回の依頼: `docs/handoff/kazumax_to_agu_cycle1_inventory_request.md`

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- `.env`、パスワード、個人情報、本物データを扱う
