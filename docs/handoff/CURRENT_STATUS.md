# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle8`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 8 Take3 P3完了・Dex(P4)再レビュー待ち
- Status: Take2 P4指摘4件(完全一致偽陽性・一括テストメモリ不安定・PC/スマホ代表値不足・部分不足テスト不足)へ対応。`App.jsx`は無変更、`main`未統合
- Version: v4.30（変更なし）
- Next: Dex(P4)が`cc-cycle8`の差分を再レビューする
- Cycle8 Take3 HEAD: push後に追記します
- P3報告: `docs/handoff/P3_CC_to_Dex/cycle_8_take3_report.md`
- レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_8_take3_review_request.md`
- Take2 reviewed HEAD: `1b48d3e`
- Take1 P4 review: `docs/handoff/P4_Dex_Review/cycle_8_review.md`
- Take2 P4 review: `docs/handoff/P4_Dex_Review/cycle_8_take2_review.md`
- Kazumax確認レベル: 現時点では確認不要（テスト・設定のみの変更）

## P2 Confirmed Rules

- 月間目標計上時間は従業員ごとの任意入力 `targetHours` とし、未設定を許す。
- 既存データや初期名簿へ推測値を埋めない。
- `targetHours` はlocalStorage内のフロントエンド項目とし、バックエンドpayloadへ送らない。
- 法的な「残業」ではなく、特殊勤務も含む「目標計上時間との差分」と表示する。
- 希望休は空き日の列挙・シャッフル方式とし、乱数運による不足をなくす。
- 確定シフトを保持し、実際の空き不足だけを明示通知する。
- CCクルー利用は推奨。使用結果または不使用理由をP3報告に記録する。

## Verification (Take3)

- frontend test: 63/63 PASS（2回連続、約80〜89秒。`pool:'forks', maxForks:2`へ変更しtimeout延長には頼らず安定化）
- time utils: 33/33 PASS
- frontend build: PASS
- `git diff --check`: PASS
- `git diff --stat -- frontend/src/App.jsx`: 差分なし(製品ロジック無変更を確認)
- CCクルー: 不使用（テスト・設定のみの狭い範囲のため、理由はP3報告参照）
- ブラウザ実機確認: 対象がテスト・設定のみのため今回の変更による影響なし（Take2時点の確認結果を維持）

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P4_CC_to_Dex/cycle_8_take3_review_request.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
