# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `air-cycle13-ui-stamp-toggle`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 13 Dex P2完了 -> CC(P3)実装待ち
- Status: Dex(P2)がAir Blueprintを監査し、空欄自動作成の主操作化、再最適化の上級確認導線、同値スタンプのトグル空欄化に加え、Kazumax追加の消しゴムスタンプと、最初から使える有休・応援・勉強会・店長会の特殊スタンプを最終指示書へ統合した。特殊スタンプは早番①相当の計上時間を初期値とし、後から既存セル編集で変更できる。履歴原子性、希望休同期、許可判定順、PC/スマホ/全画面操作、既存テスト移行を必須ゲート化した。
- Version: v4.47
- 採番の経緯: 今回はAir(P1)の設計提案および文書更新のみであり製品コード変更を伴わないため現行バージョンを維持。CC実装時にはその時点の最新mainから正確に+1を進めるよう指定。
- Next: CC(P3)が`docs/handoff/P2_Dex_to_CC/cycle_13_generation_ui_and_stamp_toggle_instructions.md`を読み、`cc-cycle13-generation-ui-stamp-toggle`で実装・検証・P3報告を行う。
- **重要**: Cycle 12はmain統合済み。Cycle 13では履歴原子性、希望休同期、トグル空欄化、消しゴム、特殊スタンプの初期hours、PC/スマホ生成導線の回帰および全件テストを必ず保証する。
- Manual: アグは毎回 `docs/AGU_START_HERE.md` を最初に読み、製品コード変更時はversion gateを通す。
- Air Blueprint (Cycle 13): `docs/handoff/P1_Air_Blueprint/cycle_13_generation_ui_and_stamp_toggle.md`
- Dex P2 Instructions (Cycle 13): `docs/handoff/P2_Dex_to_CC/cycle_13_generation_ui_and_stamp_toggle_instructions.md`
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
