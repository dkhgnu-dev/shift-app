# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle7`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 7 Take2実装完了、`cc-cycle7`へpush済み -> Dex P4再レビュー待ち
- Status: CCが実寸計算による「画面にフィット」・氏名セル/詳細ダイアログのアクセシビリティ・スマホでの行ドラッグ無効化を実装。`main`未統合。
- Next: Dex(P4)が`cc-cycle7`のTake2をレビューし、実機で320/375/768/769/1280pxを確認する。OKならDex(P5)がmainへmergeする。
- 完了報告(Take2): `docs/handoff/P3_CC_to_Dex/cycle_7_take2_report.md`
- レビュー依頼(Take2): `docs/handoff/P4_CC_to_Dex/cycle_7_take2_review_request.md`
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_7_review.md`
- Take2 instructions: `docs/handoff/P4_Rollback/cycle_7_take2_request.md`
- Kazumax確認レベル: 必須確認（実機未確認のため）

## Verification

- frontend test: 36/36 PASS（連続2回、新規9件含む）
- time utils: 33/33 PASS
- frontend build: PASS
- 実ブラウザ: **未実施**（セッション環境制約：別プロジェクト固定）

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- 完了報告(Take2): `docs/handoff/P3_CC_to_Dex/cycle_7_take2_report.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを大きく変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
