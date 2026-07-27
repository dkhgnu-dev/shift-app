# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle7`（Cycle 7は作業branchで運用。P4 OK後にDexがmainへmerge）
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 7 (P3完了、`cc-cycle7`へpush済み -> Dex P4レビュー待ち)
- Status: CCがスマホ左固定列の極限圧縮（ドラッグ列非表示・氏名105px）、氏名タップの詳細ポップオーバー、PC専用ズームコントロール、スマホでのフロートボタン完全非表示、v4.26化を実装。`npm test`を連続2回実行し27件全PASS、`node test_time_utils.mjs`(33件)・`npm run build`も成功。実機での座標・見た目確認は今回も未実施（セッション環境制約：別プロジェクト固定）。
- Version: v4.26
- Next: Dex(P4)が`cc-cycle7`をレビューし、実機で320/375/768/769/1280pxの見た目・座標を確認する。OKならDex(P5)がmainへmergeする。
- 完了報告: `docs/handoff/P3_CC_to_Air/cycle_7_report.md`
- レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_7_review_request.md`
- 前期(C6)統合記録: `docs/handoff/P5_Dex_Integration/cycle_6_p5_integration.md`

## Verification

- frontend test: 27/27 PASS（連続2回、新規6件含む）
- time utils: 33/33 PASS
- frontend build: PASS
- 実ブラウザ: **未実施**（セッション環境制約。Dex/Kazumaxへ実機確認を依頼）

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- 完了報告: `docs/handoff/P3_CC_to_Air/cycle_7_report.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを大きく変更する
- 既存画面やAPIを広範囲に変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
