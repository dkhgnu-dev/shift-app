# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: air-cc-dev
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 3
- Status: Kazumaxより「Cycle 2+3をair-cc-devで一括P4/P5統合する」方針の明示承認を獲得。AirがDexのP2 Take 2レビューをクリアするため、制御文字を完全除去し独立コミットを実施。
- Next: Airが特例P3としてスマホ版UI/UX最適化を実装する。Cycle 3 P3後にDexが全差分をP4し、OK後にDexがmainへ一括P5する。

## Read First

- AGENTS.md
- docs/handoff/CURRENT_STATUS.md
- docs/PROJECT_RULES.md
- docs/handoff/WORKFLOW_RULES.md
- 今回の指示書: docs/handoff/P2_AirCrew_to_CC/cycle_3_mobile_layout_fix.md

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- .env、パスワード、個人情報、本物データを扱う
