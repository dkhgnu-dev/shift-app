# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `main`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 8 (P2 指示書完成 -> CC 実装待ち)
- Status: 2段ロケット作戦の第1弾として、「希望休ランダム自動打ち込み（テスト検証加速機能）」および「残業・不足時間のリアルタイム過不足差分メーター（カラー警告付・スマホはタップドロワー内に大配分）」を当時一撃合体搭載する Cycle 8 の P2開発指示書 を発行策定。
- Version: 予定 v4.30
- Next: CCが `docs/handoff/P2_AirCrew_to_CC/cycle_8_random_holidays_and_overtime_badge_instructions.md` に従って P3実装と全自動テストを行い、完成後、Dex の P4 差分コードレビューへ送付する。
- 直近P2指示書: `docs/handoff/P2_AirCrew_to_CC/cycle_8_random_holidays_and_overtime_badge_instructions.md`
- 前期(C7)統合記録: `docs/handoff/P5_Dex_Integration/cycle_7_main_integration.md`
- Kazumax確認レベル: 確認不要

## Completed In Cycle 7

- スマホ左固定列圧縮と従業員詳細ポップオーバー
- ダイアログのフォーカス移動・復帰
- PCズーム、画面フィット、左右フロートボタン
- スマホ行ドラッグ無効化
- resize・タブ復帰時の再計測
- 成功時・例外時のzoom復元保証
- Version `v4.29`

## Verification

- frontend test: 42/42 PASS
- time utils: 33/33 PASS
- frontend build: PASS
- 320 / 375 / 768 / 769 / 1280px: PASS
- resize 1280 -> 1600 -> 1280px: 55% -> 74% -> 55%
- ブラウザconsole warning/error: 0件

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
