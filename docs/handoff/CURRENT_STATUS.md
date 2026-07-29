# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle8`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 8 Take4 P3完了・Dex(P4)再レビュー待ち
- Status: Vitest設定名を`maxForks`(無効)から`maxWorkers`へ訂正し、Take3報告書・レビュー依頼に残っていた誤った原因説明も訂正した。`App.jsx`・Cycle8テスト本体は無変更、`main`未統合
- Version: v4.30（変更なし）
- Next: Dex(P4)が`cc-cycle8`の差分を再レビューする
- Cycle8 Take4 HEAD: push後に追記します
- P3報告: `docs/handoff/P3_CC_to_Dex/cycle_8_take4_report.md`
- レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_8_take4_review_request.md`
- Take3 reviewed HEAD: `859c99e`
- Take1 P4 review: `docs/handoff/P4_Dex_Review/cycle_8_review.md`
- Take2 P4 review: `docs/handoff/P4_Dex_Review/cycle_8_take2_review.md`
- Take3 P4 review: `docs/handoff/P4_Dex_Review/cycle_8_take3_review.md`
- Kazumax確認レベル: 現時点では確認不要（設定名訂正のみ）

## P2 Confirmed Rules

- 月間目標計上時間は従業員ごとの任意入力 `targetHours` とし、未設定を許す。
- 既存データや初期名簿へ推測値を埋めない。
- `targetHours` はlocalStorage内のフロントエンド項目とし、バックエンドpayloadへ送らない。
- 法的な「残業」ではなく、特殊勤務も含む「目標計上時間との差分」と表示する。
- 希望休は空き日の列挙・シャッフル方式とし、乱数運による不足をなくす。
- 確定シフトを保持し、実際の空き不足だけを明示通知する。
- CCクルー利用は推奨。使用結果または不使用理由をP3報告に記録する。

## Verification (Take4)

- frontend test: 63/63 PASS（2回連続、約58〜61秒。`pool:'forks', maxWorkers:2`が正しい設定名として反映済み）
- time utils: 33/33 PASS
- frontend build: PASS
- `git diff --check`: PASS
- `git diff --stat -- frontend/src/App.jsx frontend/src/App.cycle8.test.jsx`: 差分なし(製品ロジック・テスト本体無変更を確認)
- CCクルー: 不使用（設定名1箇所の訂正のみのため、理由はP3報告参照）
- ブラウザ実機確認: 対象が設定名訂正のみのため今回の変更による影響なし

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P4_CC_to_Dex/cycle_8_take4_review_request.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
