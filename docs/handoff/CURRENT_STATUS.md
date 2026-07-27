# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle7`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 7 Take3差し戻し
- Status: Take2のDex(P4)再レビューNG。`main`未統合
- Reviewed HEAD: `233a1ffee35e5a3d0c4e6cc922f894ff87283738`
- Review: `docs/handoff/P4_Dex_Review/cycle_7_take2_review.md`
- Take3 instructions: `docs/handoff/P4_Rollback/cycle_7_take3_request.md`
- Next: CC(P3)がフィット倍率計算と恒久テストを修正し、`cc-cycle7`へpushしてDexへP4再レビューを依頼する
- Kazumax確認レベル: 確認不要

## Blocking Finding

- 実ブラウザの`table.scrollWidth`はCSS zoom後の値ではなく、現在倍率で割る計算が誤り。
- 1280pxでフィット済み55%からボタン操作すると50%へ縮小。
- 1280pxから1600pxへ広げると55%から54%へ縮小。

## Resolved In Take2

- 氏名セル・詳細ダイアログのキーボード操作とフォーカス管理
- スマホでの行ドラッグ無効化

## Verification

- frontend test: 36/36 PASS
- time utils: 33/33 PASS
- frontend build: PASS
- 実ブラウザ: 320 / 375 / 768 / 769 / 1280px確認
- resize: 1280 -> 1600pxで不具合再現
- ブラウザconsole warning/error: 0件

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P4_Rollback/cycle_7_take3_request.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
