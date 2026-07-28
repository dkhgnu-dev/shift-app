# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle8`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 8 Take2 進行中 (Air P1 仕様再整理完了 -> Dex P2 事前再監査待ち)
- Status: Air(P1/P2草案)が目標時間保存項目（`targetHours`）追加と「未設定」表示、休憩時間を控除しない配置時間差分名称変更、空きセル不足通知、タイムアウト根絶と必須確認事項を `cycle_8_take2_target_hours_replan.md` として完全策定。保存データ構造変更（危険領域）を含むため、Dex(P2)の事前再監査と最終CC向け指示書作成へ引き継ぐ。
- Version: v4.30（固定、Take2承認と統合まで維持）
- Next: Dex(P2)が `docs/handoff/P1_Air_Blueprint/cycle_8_take2_target_hours_replan.md` を事前監査し、安全を保てる最終指示書（P2_Dex_to_CC）を作成して CC に流す。
- Air Blueprint (Take2): `docs/handoff/P1_Air_Blueprint/cycle_8_take2_target_hours_replan.md`
- Replan request: `docs/handoff/P4_Rollback/cycle_8_take2_air_replan_request.md`
- P4 review: `docs/handoff/P4_Dex_Review/cycle_8_review.md`
- Kazumax確認レベル: 現時点では確認不要

## P4 Blocking Findings

- `契約日数 × 8h`は短時間勤務者に合わず、実績側も休憩込み経過時間なので「残業判定」として不正確
- 確定シフトで空きが少ない場合、希望休日数を満たせなくても通知せず正常終了する
- 全フロントテストでは超過表示テストがtimeoutし47/48
- 確定シフト保持、希望休と`requests`同期、空き不足、±2h境界の恒久テストが不足

## Verification

- `git diff --check`: PASS
- frontend test: 47/48（全件同時実行で1件timeout）
- Cycle 8テスト単独: 6/6 PASS
- time utils: 33/33 PASS
- frontend build: PASS
- 1280px実機: 希望休142件、各人2〜8日、1日最大8人、反映・操作正常
- 375px実機: 氏名列105px、差分カードは詳細内のみ、横はみ出しなし
- Browser console warning/error: 0件

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
