# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle9`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 9 P3完了・Dex(P4)レビュー待ち
- Status: CC(P3)がセル編集UI・自由時間・PCドラッグ/スマホ2点交換・Undo/Redo履歴を実装。CCクルー必須レビューで実害のある回帰2件(従業員管理タブの行drag不具合、isGenerating中の並べ替え未ブロック)を発見・修正済み。`main`未統合
- Version: v4.31（更新済み）
- Next: Dex(P4)が`cc-cycle9`の差分をレビューする
- Cycle9 HEAD: `4c5f268`（push済み、`86f1a59..4c5f268`）
- P3報告: `docs/handoff/P3_CC_to_Dex/cycle_9_interactive_editing_and_history_report.md`
- Air Blueprint (Cycle 9): `docs/handoff/P1_Air_Blueprint/cycle_9_interactive_editing_and_history_blueprint.md`
- Dex Instructions (Cycle 9): `docs/handoff/P2_Dex_to_CC/cycle_9_interactive_and_history_instructions.md`
- Cycle 8 merge commit: `7f2fa40`
- Kazumax確認レベル: 必須確認（実機未確認、CCクルーが実害ある回帰を発見、希望休の「消費」仕様の確認待ちのため）

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

## Verification (Cycle 9)

- frontend test: 119/119 PASS（2回連続、約171〜177秒）
- time utils: 33/33 PASS
- frontend build: PASS
- `git diff --check`: PASS
- CCクルー補助レビュー: 使用(必須指定)。3観点中2件採用(従業員管理タブ行drag不具合、isGenerating中の並べ替え未ブロック)
- ブラウザ実機確認: 未実施（Browserペインが別プロジェクト「シフトカレンダー」に固定される既知の制約、今回も再確認済み）
- 既知の不安定テスト: `App.cycle7.test.jsx`の「拡大・縮小ボタンで表示中のズーム率が変化する」が標準の一括実行で断続的にtimeout(20000ms)することがある(単独実行では約16〜17秒で安定PASS)。詳細はP3報告参照

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P3_CC_to_Dex/cycle_9_interactive_editing_and_history_report.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
