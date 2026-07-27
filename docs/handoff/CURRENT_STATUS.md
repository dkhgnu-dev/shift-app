# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `main`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 7 完了
- Status: Take5までの修正をDex(P4)承認後、Dex(P5)が`main`へ統合
- Merge commit: `6b8a8a7`
- Review: `docs/handoff/P4_Dex_Review/cycle_7_take5_review.md`
- Integration: `docs/handoff/P5_Dex_Integration/cycle_7_main_integration.md`
- Next: 次CycleのAir設計またはKazumaxの要望待ち
- Kazumax確認レベル: 確認不要

## Completed In Cycle 7

- スマホ左固定列圧縮と従業員詳細ポップオーバー
- ダイアログのフォーカス移動・復帰
- PCズーム、画面フィット、左右フロートボタン
- スマホ行ドラッグ無効化
- resize・タブ復帰時の再計測
- 成功時・例外時のzoom復元保証
- Version `v4.29`

## Verification

- frontend test: 42/42 PASS
- time utils: 33/33 PASS
- frontend build: PASS
- 320 / 375 / 768 / 769 / 1280px: PASS
- resize 1280 -> 1600 -> 1280px: 55% -> 74% -> 55%
- ブラウザconsole warning/error: 0件

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
