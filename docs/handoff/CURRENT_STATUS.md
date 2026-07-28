# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle8`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 8 Take2 進行中 (Dex P2事前再監査完了 -> CC P3実装待ち)
- Status: AirのTake2再計画をDexとデクスクルーが事前監査し、`targetHours`の保存契約、既存データ互換、目標だけの編集時のシフト保持、バックエンド非影響、必ず終了する希望休抽選、不足通知、恒久テストを確定した。
- Version: v4.30（固定、Take2承認と統合まで維持）
- Next: CC(P3)が `docs/handoff/P2_Dex_to_CC/cycle_8_take2_target_hours_and_random_holidays_instructions.md` に従って実装・検証し、`docs/handoff/P3_CC_to_Dex/cycle_8_take2_report.md` を作成する。
- Air Blueprint: `docs/handoff/P1_Air_Blueprint/cycle_8_take2_target_hours_replan.md`
- Dex P2: `docs/handoff/P2_Dex_to_CC/cycle_8_take2_target_hours_and_random_holidays_instructions.md`
- P4 review: `docs/handoff/P4_Dex_Review/cycle_8_review.md`
- Kazumax確認レベル: 現時点では確認不要

## P2 Confirmed Rules

- 月間目標計上時間は従業員ごとの任意入力 `targetHours` とし、未設定を許す。
- 既存データや初期名簿へ推測値を埋めない。
- `targetHours` はlocalStorage内のフロントエンド項目とし、バックエンドpayloadへ送らない。
- 法的な「残業」ではなく、特殊勤務も含む「目標計上時間との差分」と表示する。
- 希望休は空き日の列挙・シャッフル方式とし、乱数運による不足をなくす。
- 確定シフトを保持し、実際の空き不足だけを明示通知する。
- CCクルー利用は推奨。使用結果または不使用理由をP3報告に記録する。

## Verification Baseline

- Take1 `git diff --check`: PASS
- Take1 frontend full test: 47/48（1件timeout、Take2で是正対象）
- Take1 Cycle 8単独 test: 6/6 PASS
- Take1 time utils: 33/33 PASS
- Take1 frontend build: PASS
- Take1 browser 1280px / 375px: 基本操作、表示、Console 0件をDexが確認済み

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P2_Dex_to_CC/cycle_8_take2_target_hours_and_random_holidays_instructions.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
