# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle8`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 8 P4 NG・Air(P1)仕様再整理待ち
- Status: 希望休ランダム入力と残業・不足時間表示をレビューしたが、時間基準・不足時処理・性能検証に未解決事項あり
- Version: v4.30（未承認、`main`未統合）
- Next: Air(P1)が月間目標時間・休憩時間・目標未設定時・希望休不足時の仕様を再整理する
- Review target: `origin/main` `4ce3e74` .. `origin/cc-cycle8` `eab0059`
- Implementation commit: `3fd2029`
- P4 review: `docs/handoff/P4_Dex_Review/cycle_8_review.md`
- Replan request: `docs/handoff/P4_Rollback/cycle_8_take2_air_replan_request.md`
- P3 report: `docs/handoff/P3_CC_to_Dex/cycle_8_report.md`
- P2 instructions: `docs/handoff/P2_AirCrew_to_CC/cycle_8_random_holidays_and_overtime_badge_instructions.md`
- Kazumax確認レベル: 現時点では確認不要（未承認のため）

## P4 Blocking Findings

- `契約日数 × 8h`は短時間パートに合わず、実績側も休憩込み経過時間なので「残業判定」として不正確
- 確定シフトで空きが少ない場合、希望休日数を満たせなくても通知せず正常終了する
- Dex環境のフロントテストは超過表示テストがtimeoutし47/48
- 1280px実機でランダム入力後に20秒以上応答せず、完了状態を検証できなかった

## Verification

- `git diff --check`: PASS
- frontend test: 47/48（1件timeout、NG）
- time utils: 33/33 PASS
- frontend build: PASS
- 1280px実機: 初期表示・確認ダイアログまで確認。一括入力後の応答性能NG
- Browser console warning/error: 取得時点0件

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P4_Dex_Review/cycle_8_review.md`
- `docs/handoff/P4_Rollback/cycle_8_take2_air_replan_request.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標時間・休憩時間の業務定義が決まっていない
- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
