# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `air-cycle13-ui-stamp-toggle`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 13 要望確定 -> Air(P1) Blueprint待ち
- Status: Kazumaxが「空欄自動作成を主操作にし、再最適化を上級操作へ移す」「同じスタンプを同じセルへ再度押すと空欄へ戻す」を採用。要件を`docs/proposals/Kazumax_cycle_13_generation_ui_and_stamp_toggle.md`へ保存済み。
- Version: v4.47
- 採番の経緯: Take3で製品UI(App.jsx)を変更したため、直前バージョンから1つ進めた。それ以前の経緯は、main起点が当時v4.44、mergeしたcc-cycle12-stamp-and-protect側が v4.45 だったため両方より新しい値を採用し、Take3対応はさらにその次を採用した、というもの。fetch確認時点でもorigin/mainのApp.jsxはv4.44のまま(衝突なし)。
- Next: Air(P1)が要望ファイルを読み、Cycle 13 Blueprintを`docs/handoff/P1_Air_Blueprint/`へ作成する。完成後はDex(P2)事前監査へ回す。
- **重要**: Cycle 12はmain統合済み。Cycle 13では履歴、希望休同期、スタンプ操作、PC/スマホ生成導線の回帰を必ず検証する。
- Manual: アグは毎回 `docs/AGU_START_HERE.md` を最初に読み、製品コード変更時はversion gateを通す。
- Air Blueprint (Cycle 12): `docs/handoff/P1_Air_Blueprint/cycle_12_shift_protection_and_stamp_mode.md`
- Dex P2 Instructions (Cycle 12): `docs/handoff/P2_Dex_to_CC/cycle_12_protection_and_stamp_instructions.md`
- Dex P4 Review (Take1): `docs/handoff/P4_Dex_Review/cycle_12_protection_and_stamp_review.md`
- Dex P4 Rollback (Take3): `docs/handoff/P4_Rollback/cycle_12_protection_and_stamp_take3.md`
- Dex P4 Review (Take3): `docs/handoff/P4_Dex_Review/cycle_12_protection_and_stamp_take3_review.md`
- Dex P5 Integration: `docs/handoff/P5_Dex_Integration/cycle_12_main_merge.md`
- P3 Take2報告: `docs/handoff/P3_CC_to_Dex/cycle_12_protection_and_stamp_take2_report.md`
- P3 Take3報告: `docs/handoff/P3_CC_to_Dex/cycle_12_protection_and_stamp_take3_report.md`

## P2 Confirmed Rules (Cycle 11 継承)

- 画面下部アクションバーの廃止およびハンバーガーメニューへの移管はスマホ表示時のみ適用する。
- 氏名固定列は通常時の現行幅（スマホ82px、PC140px）を維持し、Cycle 11の折りたたみ時だけ28pxとする。
- 自由時間の編集、Undo/Redo (20件原子保持)、希望休のランダム・空きシャッフルロジックは一切破壊しないこと。

## v4.38未評価差分（Cycle 12で是正・回帰テスト必須）
- **土日祝の全員50%以上出勤ルール（v4.12新機能）**
  - 土曜日・日曜日・日本の祝日（振替休日含む）において、全従業員数の50%以上（切り上げ）が必ず出勤する下限制約を自動適用
- **時間帯区分（早番・中番・遅番）の出勤人数自動均等配分ロジック（v4.11新機能）**
  - シフトの開始・終了時間から `早番 (EARLY)` / `中番 (MID)` / `遅番 (LATE)` を自動分類
  - 各日の `|早番人数 - 遅番人数|` の差分を最小化し、「午前中2人で夕方以降に集中する」偏りを強力防止
- 連休制限ルール（希望休除く：社員最大2連休、パート3連休通常/4連休ソフト/5連休禁止）
- 正社員・準社員の5連勤ソフト抑制、パート等の4連勤ソフト抑制
- 曜日別最低出勤人数ハード制約（`weekday_min_staff`）
- 出勤人数「平均±1名以内」のハード制約（均等化ペナルティなし・順位配分が機能する構造）

## Read First

- `AGENTS.md`
- `docs/AGU_START_HERE.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P1_Air_Blueprint/cycle_12_shift_protection_and_stamp_mode.md`
- `docs/handoff/P2_Dex_to_CC/cycle_12_protection_and_stamp_instructions.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
