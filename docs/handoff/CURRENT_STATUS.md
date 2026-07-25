# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: main
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 4 (P2 指示書完成 -> CC 実装待ち)
- Status: 24名構成のデフォルト化について Stop Conditions（個人情報・実名扱いの回避） を確認。既存のイニシャル設定を活用し、上位3名（K.D.、N.E.、N.K.）に鍵持ち（isKeyHolder: true）をデフォルト付与する変更と、「デフォルトリセットボタン」による即時最新反映機能の実装指示書（P2）を完成。
- Next: CCが `docs/handoff/P2_AirCrew_to_CC/cycle_4_default_members_reset_instructions.md` を読み、P3実装および自律テストを行う。完了後にDex P4レビューへ回す。

## Read First

- AGENTS.md
- docs/handoff/CURRENT_STATUS.md
- docs/PROJECT_RULES.md
- docs/handoff/WORKFLOW_RULES.md
- 直近統合記録: docs/handoff/P5_Dex_Integration/cycle_2_3_p5_integration.md

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- .env、パスワード、個人情報、本物データを扱う
