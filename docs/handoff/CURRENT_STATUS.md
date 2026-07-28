# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle8`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 8 Take2 P3完了・Dex(P4)レビュー待ち
- Status: CC(P3)が`targetHours`の保存契約再設計、`契約日数×8h`廃止、希望休抽選のFisher-Yates再実装(抽選終了保証・不足通知)を実装。CCクルーによるセルフレビュー実施済み(指摘1件採用)。`main`未統合
- Version: v4.30（変更なし、Take2承認と統合まで維持）
- Next: Dex(P4)が`cc-cycle8`の差分をレビューする
- Cycle8 Take2 HEAD: push後に追記します
- P3報告: `docs/handoff/P3_CC_to_Dex/cycle_8_take2_report.md`
- Air Blueprint: `docs/handoff/P1_Air_Blueprint/cycle_8_take2_target_hours_replan.md`
- Dex P2: `docs/handoff/P2_Dex_to_CC/cycle_8_take2_target_hours_and_random_holidays_instructions.md`
- Take1 P4 review: `docs/handoff/P4_Dex_Review/cycle_8_review.md`
- Kazumax確認レベル: 必須確認（実機未確認のため）

## P2 Confirmed Rules

- 月間目標計上時間は従業員ごとの任意入力 `targetHours` とし、未設定を許す。
- 既存データや初期名簿へ推測値を埋めない。
- `targetHours` はlocalStorage内のフロントエンド項目とし、バックエンドpayloadへ送らない。
- 法的な「残業」ではなく、特殊勤務も含む「目標計上時間との差分」と表示する。
- 希望休は空き日の列挙・シャッフル方式とし、乱数運による不足をなくす。
- 確定シフトを保持し、実際の空き不足だけを明示通知する。
- CCクルー利用は推奨。使用結果または不使用理由をP3報告に記録する。

## Verification (Take2)

- frontend test: 61/61 PASS（2回連続、Take1のtimeout 47/48は再現せず解消）
- time utils: 33/33 PASS
- frontend build: PASS
- `git diff --check`: PASS
- CCクルー補助レビュー: 使用。7観点中1件採用(`normalizeStoredTargetHours`の下限チェック漏れを修正)
- ブラウザ実機確認: 未実施（Browserペインが別プロジェクトに固定される既知の制約）

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P3_CC_to_Dex/cycle_8_take2_report.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
