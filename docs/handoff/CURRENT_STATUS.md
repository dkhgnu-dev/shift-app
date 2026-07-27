# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle7`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 7 Take3実装完了、`cc-cycle7`へpush済み -> Dex P4再レビュー待ち
- Status: CCが`computeFitZoom()`を「現在zoomからの逆算」方式から「測定時だけzoomを100%へ戻して直接scrollWidthを読む」方式へ変更。`main`未統合。
- Next: Dex(P4)が`cc-cycle7`のTake3をレビューし、実機で320/375/768/769/1280px、およびresize往復（1280↔1600px）を確認する。OKならDex(P5)がmainへmergeする。
- 完了報告(Take3): `docs/handoff/P3_CC_to_Dex/cycle_7_take3_report.md`
- レビュー依頼(Take3): `docs/handoff/P4_CC_to_Dex/cycle_7_take3_review_request.md`
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_7_take2_review.md`
- Take3 instructions: `docs/handoff/P4_Rollback/cycle_7_take3_request.md`
- Kazumax確認レベル: 必須確認（実機未確認のため）

## Resolved In Take2

- 氏名セル・詳細ダイアログのキーボード操作とフォーカス管理
- スマホでの行ドラッグ無効化

## Resolved In Take3

- フィット倍率算出方法（zoom逆算 → 測定時100%復元方式へ変更）
- 恒久テストのモック前提（scrollWidth = naturalWidth × zoom → zoom非依存の一定値へ変更）

## Verification

- frontend test: 38/38 PASS（連続2回、新規/修正5件含む）
- time utils: 33/33 PASS
- frontend build: PASS
- 実ブラウザ: **未実施**（セッション環境制約：別プロジェクト固定）

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- 完了報告(Take3): `docs/handoff/P3_CC_to_Dex/cycle_7_take3_report.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
