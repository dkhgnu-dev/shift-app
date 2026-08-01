# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle12-stamp-and-protect`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 12 Dex P4レビュー完了 -> 最新mainとの統合前Take2対応・Kazumax判断待ち
- Status: Cycle 12単体の主要実装は適合。ただしmain側の全画面表示とCycle 12のスタンプUIに機能衝突があり、全画面中にスタンプ開始・筆変更ができなくなるため差し戻し。Phase 2失敗フォールバックとrequest tokenの専用回帰テストも追加が必要。詳細は `docs/handoff/P4_Dex_Review/cycle_12_protection_and_stamp_review.md` を参照。`main`未統合。
- **重要**: 実装中にmainがv4.38→v4.44まで進行し、Cycle 12は`v4.45`へ再採番した。P4時点の3-way確認では、文字競合は主に`App.jsx`のversion表示2か所と`CURRENT_STATUS.md`（main側の`index.css`変更はなし）。ただしmainの全画面表示とCycle 12のスタンプUIには、Gitが自動検出できない機能衝突がある。友達側の作業終了とKazumaxの明示承認までmergeしない。
- Version: v4.45（更新済み。採番の経緯は上記参照）
- Next: 友達側のmain作業終了・push完了を待ち、Kazumaxの明示承認後に最新mainを統合専用branchへ取り込む。全画面＋スタンプ共存と不足テストをTake2で修正し、Dexが再レビューする。作業branch/mainのどちらにも、承認前のmergeは禁止。
- Manual: アグは毎回 `docs/AGU_START_HERE.md` を最初に読み、製品コード変更時はversion gateを通す。
- Working branch: `cc-cycle12-stamp-and-protect`（最新 `main` より作成）
- Air Blueprint (Cycle 12): `docs/handoff/P1_Air_Blueprint/cycle_12_shift_protection_and_stamp_mode.md`
- Dex P2 Instructions (Cycle 12): `docs/handoff/P2_Dex_to_CC/cycle_12_protection_and_stamp_instructions.md`

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
