# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: air-cc-dev
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 3
- Status: P3完了。スマホ版UI/UX最適化（Take 2）を実装し、375px等での設定画面の空ボトムバー非表示化、および実画面検証結果の記録を行いました。
- Next: DexによるP4 Take 2の再レビュー待ち。OKが出れば一括P5（origin/mainへのマージ）を実施。

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
