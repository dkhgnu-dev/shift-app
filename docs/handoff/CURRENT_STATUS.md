# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: main（Cycle 5 P4/P5完了、mainへ統合済み）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 6 (P2 指示書完成 -> CC 実装待ち)
- Status: 左右スクロールボタンを上部から排除し、シフト表の左右の境界切れ目に「半透明フロートボタン（グラスモフィズム設計）」としてオーバーレイ配置するUI改修（及び表示面積最適化）の P2 指示書を策定中。
- Next: CCが `docs/handoff/P2_AirCrew_to_CC/cycle_6_floating_scroll_buttons_instructions.md` を受領して P3 実装と自律テストを開始。完結後、Dex P4 へ引き継ぎ。
- 直近P2指示書: `docs/handoff/P2_AirCrew_to_CC/cycle_6_floating_scroll_buttons_instructions.md`
- 前期(C5)統合報告: `docs/handoff/P5_Dex_Integration/cycle_5_p5_integration.md`

## Read First

- AGENTS.md
- docs/handoff/CURRENT_STATUS.md
- docs/PROJECT_RULES.md
- docs/handoff/WORKFLOW_RULES.md
- 完了報告(Take3): docs/handoff/P3_CC_to_Dex/cycle_5_take3_report.md

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- .env、パスワード、個人情報、本物データを扱う
