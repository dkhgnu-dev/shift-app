# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle9`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 9 Take4完了・Dex(P4)再レビュー待ち
- Status: CC(P3)がTake4指示どおりテスト追加のみを実施(「空欄自動作成」の安全停止テスト追加、生成結果全体・Undo/Redoボタン状態の実行前後不変を検証)。実装コードは無変更。標準テスト135/135を2回連続PASS。`main`未統合
- Version: v4.33（実装コード無変更のため更新なし）
- Next: Dex(P4)がTake4差分をレビューし、OKならmain統合フローへ
- Cycle9 Take4 report HEAD: `22b099c`
- P3報告(Take1): `docs/handoff/P3_CC_to_Dex/cycle_9_interactive_editing_and_history_report.md`
- P3報告(Take2): `docs/handoff/P3_CC_to_Dex/cycle_9_interactive_editing_and_history_take2_report.md`
- P3報告(Take3): `docs/handoff/P3_CC_to_Dex/cycle_9_interactive_editing_and_history_take3_report.md`
- P3報告(Take4): `docs/handoff/P3_CC_to_Dex/cycle_9_interactive_editing_and_history_take4_report.md`
- P4差し戻し(Take3): `docs/handoff/P4_Rollback/cycle_9_interactive_editing_and_history_take3.md`
- P4差し戻し(Take4): `docs/handoff/P4_Rollback/cycle_9_interactive_editing_and_history_take4.md`
- Air Blueprint (Cycle 9): `docs/handoff/P1_Air_Blueprint/cycle_9_interactive_editing_and_history_blueprint.md`
- Dex Instructions (Cycle 9): `docs/handoff/P2_Dex_to_CC/cycle_9_interactive_and_history_instructions.md`
- Cycle 8 merge commit: `7f2fa40`
- Kazumax確認レベル: 確認不要（Dex(P4)レビュー待ち）

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

## Verification (Cycle 9 Take4, CC P3)

- frontend test(App.cycle9.test.jsxのみ): 41/41 PASS（約50〜56秒）
- frontend test(全体): 135/135 PASS（2回連続、約109〜112秒）
- time utils: 33/33 PASS
- frontend build: PASS（バンドルハッシュ前回と同一、実装コード無変更のため想定通り）
- `git diff --check`: PASS（CRLF/LF警告のみ）
- CCクルー: Take4出口指示により今回は不使用(範囲が明確なテスト追加のみのため)
- ブラウザ実機確認: テストのみの変更のため未実施

### 参考: Take2差し戻し時点(Dex P4)のNG実測

- frontend test: NG（Cycle 8希望休テスト3件timeout）
- Cycle 8単独: 20/21 PASS、1件timeout（23.9秒）
- Cycle 7ズーム単独: timeout（24.9秒）
- Cycle 9単独: 56/56 PASS（73.0秒）

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P4_Rollback/cycle_9_interactive_editing_and_history_take4.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
