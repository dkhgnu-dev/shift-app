# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `main`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 6 完了
- Status: Cycle 6 Take2をP4 OK判定し、Dex(P5)が`main`へfast-forward統合済み
- Version: v4.25
- Review: `docs/handoff/P4_Dex_Review/cycle_6_take2_review.md`
- Integration: `docs/handoff/P5_Dex_Integration/cycle_6_p5_integration.md`
- Next: Kazumax / Airが次Cycleを起票する
- Kazumax確認レベル: 確認不要

## Verification

- frontend test: 21/21 PASS（連続2回）
- time utils: 33/33 PASS
- frontend build: PASS
- 実ブラウザ: 320 / 375 / 768 / 769 / 1280px PASS
- ブラウザconsole warning/error: 0件

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P5_Dex_Integration/cycle_6_p5_integration.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを大きく変更する
- 既存画面やAPIを広範囲に変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
