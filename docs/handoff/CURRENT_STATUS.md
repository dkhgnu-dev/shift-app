# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle8`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 8 Take5 P4 OK・Dex(P5)統合待ち
- Status: Take3の正式handoff文書訂正を確認し、Cycle 8はP4 OK。製品・設定・テスト・文書すべて承認可能。`main`未統合
- Version: v4.30（変更なし）
- Next: Dex(P5)が`main`を最新化し、レビュー済み`cc-cycle8`を統合・pushする
- Cycle8 Take5 reviewed HEAD: `295de2f`（push済み、`fb322b0..295de2f`）
- P3報告: `docs/handoff/P3_CC_to_Dex/cycle_8_take5_report.md`
- レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_8_take5_review_request.md`
- Take4 reviewed HEAD: `dbc3a79`
- Take1 P4 review: `docs/handoff/P4_Dex_Review/cycle_8_review.md`
- Take2 P4 review: `docs/handoff/P4_Dex_Review/cycle_8_take2_review.md`
- Take3 P4 review: `docs/handoff/P4_Dex_Review/cycle_8_take3_review.md`
- Take4 P4 review: `docs/handoff/P4_Dex_Review/cycle_8_take4_review.md`
- Take5 P4 review: `docs/handoff/P4_Dex_Review/cycle_8_take5_review.md`
- Kazumax確認レベル: 現時点では確認不要（文書訂正のみ）

## P2 Confirmed Rules

- 月間目標計上時間は従業員ごとの任意入力 `targetHours` とし、未設定を許す。
- 既存データや初期名簿へ推測値を埋めない。
- `targetHours` はlocalStorage内のフロントエンド項目とし、バックエンドpayloadへ送らない。
- 法的な「残業」ではなく、特殊勤務も含む「目標計上時間との差分」と表示する。
- 希望休は空き日の列挙・シャッフル方式とし、乱数運による不足をなくす。
- 確定シフトを保持し、実際の空き不足だけを明示通知する。
- CCクルー利用は推奨。使用結果または不使用理由をP3報告に記録する。

## Verification (Take5)

- コード・Vitest設定の変更なしのため、テスト再実行は未実施（指示書の完了条件通り）
- Take4確定結果(参考): frontend test 63/63 PASS（2回連続）、time utils 33/33 PASS、build PASS
- `git diff --check`: PASS
- `git status --short`: `docs/handoff/`配下2ファイルのみ変更、`frontend/`配下は無変更
- CCクルー: 不使用（文書2箇所の訂正のみのため、理由はP3報告参照）
- ブラウザ実機確認: 対象が文書訂正のみのため今回の変更による影響なし

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P4_CC_to_Dex/cycle_8_take5_review_request.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
