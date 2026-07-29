# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle9`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 9 P4差し戻し・CC(P3) Take2待ち
- Status: Dex(P4)が`daa73c1`をレビューし、希望休の生成後消失、自由時間の自動生成候補混入、標準テストtimeout、従業員管理画面の行全体drag、往復スワイプ誤判定等を確認したためTake2差し戻し。`main`未統合
- Version: v4.31（更新済み）
- Next: CC(P3)がP4差し戻し指示に従ってTake2を実装・検証し、`v4.32`として`cc-cycle9`へpush後にDex(P4)へ戻す
- Cycle9 review HEAD: `daa73c1`
- P3報告: `docs/handoff/P3_CC_to_Dex/cycle_9_interactive_editing_and_history_report.md`
- P4差し戻し: `docs/handoff/P4_Rollback/cycle_9_interactive_editing_and_history_take2.md`
- Air Blueprint (Cycle 9): `docs/handoff/P1_Air_Blueprint/cycle_9_interactive_editing_and_history_blueprint.md`
- Dex Instructions (Cycle 9): `docs/handoff/P2_Dex_to_CC/cycle_9_interactive_and_history_instructions.md`
- Cycle 8 merge commit: `7f2fa40`
- Kazumax確認レベル: 現時点では確認不要（Take2修正待ち）

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

## Verification (Cycle 9 P4)

- frontend test: NG（Cycle 8希望休テスト3件timeout）
- Cycle 8単独: 20/21 PASS、1件timeout（23.9秒）
- Cycle 7ズーム単独: timeout（24.9秒）
- Cycle 9単独: 56/56 PASS（73.0秒）
- time utils: 33/33 PASS
- frontend build: PASS
- `git diff --check`: PASS
- デクスクルー補助レビュー: 使用。履歴・生成条件担当と操作・性能担当の2視点
- ブラウザ実機確認: PC表示、セル編集ダイアログ、Console error 0件を確認。全幅・実タッチはTake2後に実施

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P4_Rollback/cycle_9_interactive_editing_and_history_take2.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
