# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `main`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 11 完了
- Status: Take2をP4 OKと判定し、`cc-cycle11`を競合なしで`main`へ統合済み。詳細は `docs/handoff/P5_Dex_Integration/cycle_11_main_integration.md` を参照。
- Version: v4.37（更新済み）
- Next: 次Cycleの要件整理またはAir(P1) Blueprint作成
- Working branch: `main`
- Air Blueprint (Cycle 11): `docs/handoff/P1_Air_Blueprint/cycle_11_health_alerts_and_collapsible_names.md`
- Dex Instructions (Cycle 11): `docs/handoff/P2_Dex_to_CC/cycle_11_health_and_collapsible_instructions.md`
- P3報告 (Cycle 11): `docs/handoff/P3_CC_to_Dex/cycle_11_health_and_collapsible_report.md`
- P4 Review (Cycle 11): `docs/handoff/P4_Dex_Review/cycle_11_health_and_collapsible_review.md`
- Take2 Instructions: `docs/handoff/P4_Rollback/cycle_11_health_and_collapsible_take2.md`
- P3 Take2報告: `docs/handoff/P3_CC_to_Dex/cycle_11_health_and_collapsible_take2_report.md`
- P4 Take2再レビュー: `docs/handoff/P4_Dex_Review/cycle_11_health_and_collapsible_take2_review.md`
- P5 main統合: `docs/handoff/P5_Dex_Integration/cycle_11_main_integration.md`
- Cycle 11 merge commit: `78d2491`
- Cycle 10 merge commit: `6b5e23a`
- Kazumax確認レベル: 確認不要

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
- `docs/handoff/P4_Dex_Review/cycle_11_health_and_collapsible_review.md`
- `docs/handoff/P4_Rollback/cycle_11_health_and_collapsible_take2.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
