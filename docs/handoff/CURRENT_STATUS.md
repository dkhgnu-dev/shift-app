# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle11`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 11 CC P3 実装・検証完了 -> Dex P4レビュー待ち
- Status: 6連勤/休息不足の健全性チェッカー(`cycle11Utils.js`、useMemo派生計算)と氏名列28px折りたたみ(UI専用state)を実装。CCクルー3班(A/B/C)による独立監査を実施し、クルーCの指摘(バージョン未更新)を採用してv4.36へ修正済み。詳細は `docs/handoff/P3_CC_to_Dex/cycle_11_health_and_collapsible_report.md` を参照。`main`未統合。
- Version: v4.36（更新済み）
- Next: Dex(P4)が `docs/handoff/P3_CC_to_Dex/cycle_11_health_and_collapsible_report.md` を確認し、DIFFレビューを行う
- Working branch: `cc-cycle11`（最新 `main` より作成）
- Air Blueprint (Cycle 11): `docs/handoff/P1_Air_Blueprint/cycle_11_health_alerts_and_collapsible_names.md`
- Dex Instructions (Cycle 11): `docs/handoff/P2_Dex_to_CC/cycle_11_health_and_collapsible_instructions.md`
- P3報告 (Cycle 11): `docs/handoff/P3_CC_to_Dex/cycle_11_health_and_collapsible_report.md`
- Cycle 10 merge commit: `6b5e23a`
- Kazumax確認レベル: 確認不要（Dex P4レビュー待ち）

## P2 Confirmed Rules (Cycle 10 継承)

- 画面下部アクションバーの廃止およびハンバーガーメニューへの移管はスマホ表示時のみ適用する。
- 氏名固定列は通常時の現行幅（スマホ82px、PC140px）を維持し、Cycle 11の折りたたみ時だけ28pxとする。
- 自由時間の編集、Undo/Redo (20件原子保持)、希望休のランダム・空きシャッフルロジックは一切破壊しないこと。

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P1_Air_Blueprint/cycle_11_health_alerts_and_collapsible_names.md`
- `docs/handoff/P2_Dex_to_CC/cycle_11_health_and_collapsible_instructions.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
