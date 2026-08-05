# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle13-generation-ui-stamp-toggle`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 13 Take2 Dex(P4)承認 -> P5統合判断待ち
- Status: P4差戻しのP1（特殊スタンプが早番①由来の4hで保存される）を修正。有休・応援・勉強会・店長会の初期計上時間を**固定8h**の製品ルールへ統一し、`computeEarlyShiftHours()`を廃止して`SPECIAL_STAMP_DEFAULT_HOURS = 8` / `resolveStampHours(shiftId)`へ置換（shiftMasterを一切参照しない）。①/③を変更・削除しても8hのままという回帰テストを追加。P4承認。既存4hセルは利用者の手入力と区別できないため自動移行せず、新規スタンプだけを8hにする。パレット表示は短い名前のみ、スタンプ後の個別hours編集は維持。Take1で受理済みの生成UI整理・トグル空欄化・消しゴムは変更なし。
- Version: v4.49（Take2で+1）
- Next: Cycle 13はP5統合判断へ進める。mainは未統合のまま。
- Air Blueprint (Cycle 13): `docs/handoff/P1_Air_Blueprint/cycle_13_generation_ui_and_stamp_toggle.md`
- Dex P2 Instructions (Cycle 13): `docs/handoff/P2_Dex_to_CC/cycle_13_generation_ui_and_stamp_toggle_instructions.md`
- P4差戻し (Cycle 13 Take2): `docs/handoff/P4_Rollback/cycle_13_generation_ui_and_stamp_toggle_take2.md`
- P4承認 (Cycle 13 Take2): `docs/handoff/P4_Dex_Review/cycle_13_generation_ui_and_stamp_toggle_take2_review.md`
- P3報告 (Cycle 13 Take2): `docs/handoff/P3_CC_to_Dex/cycle_13_generation_ui_and_stamp_toggle_take2_report.md`
- P3報告 (Cycle 13 Take1): `docs/handoff/P3_CC_to_Dex/cycle_13_generation_ui_and_stamp_toggle_report.md`
- Cycle 12関連文書一式(main統合済み): `docs/handoff/P1_Air_Blueprint/`・`P2_Dex_to_CC/`・`P3_CC_to_Dex/`・`P4_Dex_Review/`・`P4_Rollback/`・`P5_Dex_Integration/`配下の`cycle_12_*`ファイルを参照

## Verification (Cycle 13 Take2, CC P3)

- version gate: PASS (`node scripts/check_version_gate.mjs` -> App/CURRENT_STATUSともv4.49)
- frontend test: 254/254 PASS（2回連続、約213〜230秒）
- frontend build: PASS
- `git diff --check`: PASS（CRLF/LF警告のみ）
- CCクルー: 未使用。今回はP4差戻しのP1 1件（固定値化）に限定した小さな変更で、判定ロジックの新規分岐を増やしていないため
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
