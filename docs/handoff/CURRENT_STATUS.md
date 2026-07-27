# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle7`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 7 Take4実装完了、`cc-cycle7`へpush済み -> Dex P4再レビュー待ち
- Status: CCが`computeFitZoom()`のtry/finally化(zoom復元保証)、例外経路の恒久テストを実装。修正過程で、null返却化により顕在化した既存回帰(タブ復帰時にオーバーフロー状態が再計測されない)を発見し合わせて修正。`main`未統合。
- Next: Dex(P4)が`cc-cycle7`のTake4をレビューし、実機で320/375/768/769/1280px、resize往復、console warning/errorを確認する。OKならDex(P5)がmainへmergeする。
- 完了報告(Take4): `docs/handoff/P3_CC_to_Dex/cycle_7_take4_report.md`
- レビュー依頼(Take4): `docs/handoff/P4_CC_to_Dex/cycle_7_take4_review_request.md`
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_7_take3_review.md`
- Take4 instructions: `docs/handoff/P4_Rollback/cycle_7_take4_request.md`
- Kazumax確認レベル: 必須確認（実機未確認のため）

## Passed In Take3

- 1280px初期55%、再フィット55%
- 手動65%から再フィット55%
- resize 1280 -> 1600 -> 1280pxで55 -> 74 -> 55%
- 320 / 375 / 768 / 769 / 1280px回帰
- アクセシビリティ、スマホ`draggable`

## Resolved In Take4

- `computeFitZoom()`のtry/finally化（測定失敗・例外時もzoom復元）
- 副次的に発見した回帰: タブ復帰時にfitが直前と同値だとReactのstate bailoutで`updateScrollButtons()`が呼ばれない問題を修正

## Verification

- frontend test: 42/42 PASS（連続2回、新規4件含む）
- time utils: 33/33 PASS
- frontend build: PASS
- 実ブラウザ: **未実施**（セッション環境制約：別プロジェクト固定）

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- 完了報告(Take4): `docs/handoff/P3_CC_to_Dex/cycle_7_take4_report.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
