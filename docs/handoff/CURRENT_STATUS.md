# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle9`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 9 進行中 (Air P1完了 -> Dex P2監査・指示書完了 -> CC P3実装待ち)
- Status: Dex(P2)がAir Blueprintと現行コードを監査し、透明select・行drag競合、希望休二重データ、自由時間と空欄自動作成の互換、Undo/Redo原子性、タッチ誤反応、テスト性能の条件を確定した。
- Version: v4.30（進行中。Cycle 9 完成・検証通過時に v4.31 へ更新予定）
- Next: CC(P3)がP2最終指示書に従って`cc-cycle9`へ実装し、テスト・ブラウザ確認・CCクルー補助レビュー後にDex(P4)へ戻す。
- Working branch: `cc-cycle9`（最新 `main` から生成）
- Air Blueprint (Cycle 9): `docs/handoff/P1_Air_Blueprint/cycle_9_interactive_editing_and_history_blueprint.md`
- Dex Instructions (Cycle 9): `docs/handoff/P2_Dex_to_CC/cycle_9_interactive_and_history_instructions.md`
- Cycle 8 merge commit: `7f2fa40`
- Kazumax確認レベル: 現時点では確認不要（CC実装前）

## P2 Confirmed Rules (Cycle 9)

- スマホは768px以下、PCは769px以上。
- セル全面の透明selectを廃止し、短タップ・クリック・キーボードで編集画面を開く。
- 横移動8px以上、pointercancel、複数指ではセル操作を発火させない。
- 行並べ替えは専用ハンドル、セル交換は別drag種別として干渉させない。
- 自由時間は既存`shiftMaster`と空欄自動作成payloadへ統合し、バックエンドを変更しない。
- 履歴は`generatedResult`, `employees`, `shiftMaster`を原子的に最大20件保持する。
- 希望休はmatrixから`employees[].requests`を再構築する共通関数で同期する。
- 非同期処理は成功時だけ1履歴を作り、失敗・キャンセル・同値保存では履歴を変えない。
- CCクルー利用は必須。イベント競合、履歴原子性、テスト性能を分担監査する。

## P2 Confirmed Rules (Cycle 8 継承)

- 月間目標計上時間は従業員ごとの任意入力 `targetHours` とし、未設定を許す。
- 既存データや初期名簿へ推測値を埋めない。
- `targetHours` はlocalStorage内のフロントエンド項目とし、バックエンドpayloadへ送らない。
- 法的な「残業」ではなく、特殊勤務も含む「目標計上時間との差分」と表示する。
- 希望休は空き日の列挙・シャッフル方式とし、乱数運による不足をなくす。
- 確定シフトを保持し、実際の空き不足だけを明示通知する。
- CCクルー利用は推奨。使用結果または不使用理由をP3報告に記録する。

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P1_Air_Blueprint/cycle_9_interactive_editing_and_history_blueprint.md`
- `docs/handoff/P2_Dex_to_CC/cycle_9_interactive_and_history_instructions.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
