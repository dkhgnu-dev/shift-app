# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle8`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 8 P3完了・Dex(P4)差分レビュー待ち
- Status: 「希望休ランダム自動入力ボタン」および「残業・不足時間のリアルタイム過不足カラー警告メーター」をCC(P3)が実装。`main`未統合
- Version: v4.30
- Next: Dex(P4)が`cc-cycle8`の差分をレビューする
- P3報告: `docs/handoff/P3_CC_to_Dex/cycle_8_report.md`
- 対応P2指示書: `docs/handoff/P2_AirCrew_to_CC/cycle_8_random_holidays_and_overtime_badge_instructions.md`
- 前期(C7)統合記録: `docs/handoff/P5_Dex_Integration/cycle_7_main_integration.md`
- Kazumax確認レベル: 必須確認（実機未確認、目標時間の算出方法に独自近似を採用のため）

## Passed In Cycle 8 (P3)

- 🎲希望休ランダム入力ボタン（確認ダイアログ、正社員系2〜4日/パート系5〜8日、確定シフト保護、簡易分散）
- 📊残業・不足時間のリアルタイム過不足カラー警告（PC:インラインタグ、スマホ:ポップオーバー内のみ）
- Version `v4.30`

## Blocking Points For Dex Review

- 目標時間の算出方法: 実データに時間ベースの目標フィールドがないため「契約日数×8h」の近似値を独自採用（要判断）

## Completed In Cycle 7

- スマホ左固定列圧縮と従業員詳細ポップオーバー
- ダイアログのフォーカス移動・復帰
- PCズーム、画面フィット、左右フロートボタン
- スマホ行ドラッグ無効化
- resize・タブ復帰時の再計測
- 成功時・例外時のzoom復元保証
- Version `v4.29`

## Verification

- frontend test: 48/48 PASS（2回）
- time utils: 33/33 PASS
- frontend build: PASS
- `git diff --check`: PASS
- ブラウザconsole warning/error: 実機未確認（Browserペインが別プロジェクトに固定される既知の制約）

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P3_CC_to_Dex/cycle_8_report.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
