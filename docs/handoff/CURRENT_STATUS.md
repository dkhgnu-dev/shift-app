# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `main`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 11 完了 ＋ v4.44（全画面表示のレイアウト調整・閉じるボタン被り解消）
- Status: v4.44リリース完了。main ブランチへ push 済み。
- Version: v4.44（更新済み）
- Next: Render自動デプロイ後に動作確認。
- Manual: アグは毎回 `docs/AGU_START_HERE.md` を最初に読み、製品コード変更時はversion gateを通す。

## P2 Confirmed Rules (Cycle 10 継承)

- 画面下部アクションバーの廃止およびハンバーガーメニューへの移管はスマホ表示時のみ適用する。
- 氏名固定列は通常時の現行幅（スマホ82px、PC140px）を維持し、Cycle 11の折りたたみ時だけ28pxとする。
- 自由時間の編集、Undo/Redo (20件原子保持)、希望休のランダム・空きシャッフルロジックは一切破壊しないこと。

## アグ担当機能（v4.12最新統合）
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
