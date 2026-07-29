# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle9`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 9 Take2完了・Dex(P4)再レビュー待ち
- Status: CC(P3)がTake2の全Finding(P1-1〜P1-4, P2-1〜P2-3)を修正し、CCクルー再レビューも実施(P1-2の`allowed_shifts`空フォールバック抜け穴を追加検出・修正済み)。標準テスト130/130を2回連続PASS。`main`未統合
- Version: v4.32（更新済み）
- Next: Dex(P4)がTake2差分をレビューし、OKならmain統合フローへ
- Cycle9 Take2 report HEAD: `30d4824`
- P3報告(Take1): `docs/handoff/P3_CC_to_Dex/cycle_9_interactive_editing_and_history_report.md`
- P3報告(Take2): `docs/handoff/P3_CC_to_Dex/cycle_9_interactive_editing_and_history_take2_report.md`
- P4差し戻し: `docs/handoff/P4_Rollback/cycle_9_interactive_editing_and_history_take2.md`
- Air Blueprint (Cycle 9): `docs/handoff/P1_Air_Blueprint/cycle_9_interactive_editing_and_history_blueprint.md`
- Dex Instructions (Cycle 9): `docs/handoff/P2_Dex_to_CC/cycle_9_interactive_and_history_instructions.md`
- Cycle 8 merge commit: `7f2fa40`
- Kazumax確認レベル: 現時点では確認不要（Dex(P4)レビュー待ち）

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

## Verification (Cycle 9 Take2, CC P3)

- frontend test: 130/130 PASS（2回連続、約113〜114秒、timeout再現なし）
- time utils: 33/33 PASS
- frontend build: PASS
- `git diff --check`: PASS（CRLF/LF警告のみ）
- CCクルー補助レビュー: 使用。7 Finding全件の実装確認・整合性・新規バグ有無を担当。P1-2のallowed_shifts空フォールバック抜け穴を追加検出・修正済み
- ブラウザ実機確認: 今回も無関係な別アプリ(「シフトカレンダー」)がBrowser paneに固定され未実施。コードレベル検証とjsdomテストで代替(既承認の既知制約)

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
- `docs/handoff/P4_Rollback/cycle_9_interactive_editing_and_history_take2.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
