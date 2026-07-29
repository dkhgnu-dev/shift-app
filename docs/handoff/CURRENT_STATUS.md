# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle9`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 9 進行中 (Air P1 統合設計書完了 -> Dex P2 事前リスク＆構成監査待ち)
- Status: Air(P1/P2草案)が「セルのクリック／タップでの直接時間微調整・スマホ対応スワップ交換・保護保証Undo/Redo履歴スナップショット」を同時構築する効率重視の設計書 `cycle_9_interactive_editing_and_history_blueprint.md` を策定。ステート移行構造とタッチイベントの干渉を排除するため、Dex(P2)への事前セキュリティ・再描画リスク監査に回す。
- Version: v4.30（進行中。Cycle 9 完成・検証通過時に v4.31 へ更新予定）
- Next: Dex(P2)が本Blueprintを監査し、CC(P3)が迷わずに作れ・タイムアウトゼロテストを守れる最強の実装指示書（P2_Dex_to_CC）を策定して合図を出す
- Working branch: `cc-cycle9`（最新 `main` から生成）
- Air Blueprint (Cycle 9): `docs/handoff/P1_Air_Blueprint/cycle_9_interactive_editing_and_history_blueprint.md`
- Cycle 8 merge commit: `7f2fa40`
- Kazumax確認レベル: 現時点では確認不要（事前指示策定段階）

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

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
