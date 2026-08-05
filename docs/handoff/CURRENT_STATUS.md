# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle13-generation-ui-stamp-toggle`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 13 Dex(P4)差戻し -> CC(P3) Take2修正待ち
- Status: 生成UI整理、スタンプの同値トグル空欄化、消しゴム、特殊スタンプ4種は実装済み。Dex(P4)で、特殊スタンプが早番①相当の4hで保存されることを検出した。Kazumax確定の③相当8hへTake2で統一するまで未承認。その他のCCクルーレビュー対象はP4で大きな問題なし。
- Version: v4.48（更新済み）
- Next: CC(P3)が`docs/handoff/P4_Rollback/cycle_13_generation_ui_and_stamp_toggle_take2.md`のP1（特殊スタンプ4種の初期計上時間を8hへ統一）を修正し、Take2報告をDex(P4)へ提出する。mainへはmergeしない。
- Air Blueprint (Cycle 13): `docs/handoff/P1_Air_Blueprint/cycle_13_generation_ui_and_stamp_toggle.md`
- Dex P2 Instructions (Cycle 13): `docs/handoff/P2_Dex_to_CC/cycle_13_generation_ui_and_stamp_toggle_instructions.md`
- P3報告 (Cycle 13): `docs/handoff/P3_CC_to_Dex/cycle_13_generation_ui_and_stamp_toggle_report.md`
- Cycle 12関連文書一式(main統合済み): `docs/handoff/P1_Air_Blueprint/`・`P2_Dex_to_CC/`・`P3_CC_to_Dex/`・`P4_Dex_Review/`・`P4_Rollback/`・`P5_Dex_Integration/`配下の`cycle_12_*`ファイルを参照

## Verification (Cycle 13, CC P3)

- version gate: PASS (`node scripts/check_version_gate.mjs` -> App/CURRENT_STATUSともv4.48)
- frontend test: 248/248 PASS（2回連続、約243〜254秒）
- frontend build: PASS
- `git diff --check`: PASS（CRLF/LF警告のみ）
- CCクルー: 使用(推奨どおり)。生成UI整理/トグル空欄化/消しゴム/特殊スタンプの4領域すべてadequately implemented判定。指摘2件(version不一致・全画面テスト不足)は本コミットで解消済み
- ブラウザ実機確認: 無関係な別アプリ(「シフトカレンダー」)がBrowser paneに固定され未実施。コードレベル検証とjsdomテストで代替(既承認の既知制約)

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
- `docs/handoff/P3_CC_to_Dex/cycle_13_generation_ui_and_stamp_toggle_report.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
