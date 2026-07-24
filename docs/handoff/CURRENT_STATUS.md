# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: air-cc-dev （※mainへの衝突防止のため専用ブランチで運用中）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: エアクルー (Air Crew) ※Dex制限中の代用

## Current State

- Cycle: 3（並行してCycle 2 Take3のレビュー待ちあり、下記参照）
- P4 Review: NG for Cycle 2 UI Take3 at `a0bec36`. Take4 must provide reproducible TimePicker UI-state verification and separate Cycle 3 handoff changes from the Cycle 2 P5 scope.
- Status: Airがスマホ版レイアウト崩れの原因（App.jsxのインラインスタイル優先）を特定し、CC向けの実装指示書（P2）を作成完了。
- Next: CCによるレイアウト修正（P3）待ち。

### Cycle 2 Take3（TimePicker競合修正、Dexレビュー待ち）

- P4 Review: NG for UI Take2 at `9e5126c`。Take3で「編集中は矢印をdisabledにする」方針で競合を解消し、`5cea2ae`としてpush済み。
- 完了報告: `docs/handoff/P3_CC_to_Air/cycle_2_ui_enhancements_take3_report.md`
- レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_2_ui_enhancements_take3_review_request.md`
- 注意: Take2・Take3ともこのセッションのBrowserペインが別プロジェクト設定に固定されブラウザ実機確認ができていない。

## Read First

- AGENTS.md
- docs/handoff/CURRENT_STATUS.md
- docs/PROJECT_RULES.md
- docs/handoff/WORKFLOW_RULES.md
- 今回の指示書: docs/handoff/P2_AirCrew_to_CC/cycle_3_mobile_layout_fix.md
- Cycle 2 Take3レビュー待ち: docs/handoff/P4_CC_to_Dex/cycle_2_ui_enhancements_take3_review_request.md
- バックログ: docs/BACKLOG.md

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- .env、パスワード、個人情報、本物データを扱う
