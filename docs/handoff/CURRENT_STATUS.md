# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle6`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 6
- Status: Take2のDex(P4)レビュー完了、P4 OK
- Review target: `75f23319561b349b1ac0df307d5c62fd8e22de23`
- Review: `docs/handoff/P4_Dex_Review/cycle_6_take2_review.md`
- Next: Dex(P5)が`main`の最新化と競合確認後、`cc-cycle6`を`main`へ統合してpushする

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
- `docs/handoff/P4_Dex_Review/cycle_6_take2_review.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを大きく変更する
- 既存画面やAPIを広範囲に変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
