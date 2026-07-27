# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle7`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 7 Take5差し戻し
- Status: Take4のDex(P4)再レビューNG。`main`未統合
- Reviewed HEAD: `c042557e3cfd70ad6819a06d57244509a7847cc5`
- Review: `docs/handoff/P4_Dex_Review/cycle_7_take4_review.md`
- Take5 instructions: `docs/handoff/P4_Rollback/cycle_7_take5_request.md`
- Next: CC(P3)が成功時zoom復元を直接保証する恒久テストだけを修正し、`cc-cycle7`へpushしてDexへP4再レビューを依頼する
- Kazumax確認レベル: 確認不要

## Blocking Finding

- 成功時のzoom復元テストがReact再描画後の最終値しか見ておらず、`finally`の復元を削除しても通る可能性がある。

## Passed In Take4

- 製品コードの`try/catch/finally`と測定失敗時state保持
- 例外時zoom復元・表示倍率不変・descriptor復元テスト
- タブ復帰時のオーバーフロー再計測
- 1280px初期/再フィット55%
- resize 1280 -> 1600 -> 1280pxで55 -> 74 -> 55%
- 320 / 375 / 768 / 769 / 1280px回帰
- ブラウザconsole warning/error 0件

## Verification

- frontend test: 42/42 PASS（2回）
- time utils: 33/33 PASS
- frontend build: PASS
- `git diff --check`: PASS

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P4_Rollback/cycle_7_take5_request.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
