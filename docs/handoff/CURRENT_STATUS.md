# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle7`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 7 Take2差し戻し
- Status: Dex(P4)レビューNG。`main`未統合
- Reviewed HEAD: `a63ce06914faaecc7df55c7380a280a577e5c324`
- Review: `docs/handoff/P4_Dex_Review/cycle_7_review.md`
- Take2 instructions: `docs/handoff/P4_Rollback/cycle_7_take2_request.md`
- Next: CC(P3)が3件を修正し、`cc-cycle7`へpushしてDexへP4再レビューを依頼する
- Kazumax確認レベル: 確認不要

## Blocking Findings

1. PCの「100%フィット」が100%へ戻すだけで、1280pxでも全月表示にならない。
2. 氏名セルと詳細ダイアログをキーボード操作できない。
3. スマホでドラッグ列を隠しても行が`draggable=true`のまま。

## Verification

- frontend test: 27/27 PASS
- time utils: 33/33 PASS
- frontend build: PASS
- 実ブラウザ: 320 / 375 / 768 / 769 / 1280px確認
- ブラウザconsole warning/error: 0件

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P4_Rollback/cycle_7_take2_request.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを大きく変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
