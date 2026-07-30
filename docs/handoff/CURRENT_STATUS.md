# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle11`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 11 進行中 (Dex P2 事前技術監査・最終指示書完了 -> CC P3実装待ち)
- Status: Dex(P2)がAir Blueprintを事前監査し、勤務/非勤務分類、6連勤の警告範囲、11時間未満の実時刻判定、Undo/Redoからの派生再計算、28px氏名列、Zoom/タッチ共存、CCクルー監査、テスト・実機条件を `cycle_11_health_and_collapsible_instructions.md` に確定した。
- Version: v4.35（進行中。Cycle 11 実装完成・合格時に v4.36 へ更新指定）
- Next: CC(P3)が `docs/handoff/P2_Dex_to_CC/cycle_11_health_and_collapsible_instructions.md` に従って実装し、P3報告をDex(P4)へ提出する
- Working branch: `cc-cycle11`（最新 `main` より作成）
- Air Blueprint (Cycle 11): `docs/handoff/P1_Air_Blueprint/cycle_11_health_alerts_and_collapsible_names.md`
- Dex Instructions (Cycle 11): `docs/handoff/P2_Dex_to_CC/cycle_11_health_and_collapsible_instructions.md`
- Cycle 10 merge commit: `6b5e23a`
- Kazumax確認レベル: 現時点では確認不要（P2監査策定段階）

## P2 Confirmed Rules (Cycle 10 継承)

- 画面下部アクションバーの廃止およびハンバーガーメニューへの移管はスマホ表示時のみ適用する。
- 氏名固定列幅は最大85px目安とし、スマホでは全幅エリア極大開放を維持する。
- 自由時間の編集、Undo/Redo (20件原子保持)、希望休のランダム・空きシャッフルロジックは一切破壊しないこと。

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P1_Air_Blueprint/cycle_11_health_alerts_and_collapsible_names.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
