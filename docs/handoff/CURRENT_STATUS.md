# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle7`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 7 Take5 P4レビューOK
- Status: Take5で成功時zoom復元の恒久テストを強化し、Dex(P4)承認。`main`統合待ち
- Reviewed HEAD: `5acaab1`
- Review: `docs/handoff/P4_Dex_Review/cycle_7_take5_review.md`
- Next: Dex(P5)が最新版mainを取得し、`cc-cycle7`をmerge/pushする
- Kazumax確認レベル: 確認不要

## Passed

- スマホ左固定列圧縮と従業員詳細ポップオーバー
- PCズーム、画面フィット、左右フロートボタン
- 成功時・例外時のzoom復元保証
- タブ復帰時のオーバーフロー再計測
- 1280px初期/再フィット55%
- resize 1280 -> 1600 -> 1280pxで55 -> 74 -> 55%
- 320 / 375 / 768 / 769 / 1280px回帰
- ブラウザconsole warning/error 0件

## Verification

- frontend test: 42/42 PASS
- time utils: 33/33 PASS
- frontend build: PASS
- `git diff --check`: PASS

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P4_Dex_Review/cycle_7_take5_review.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
