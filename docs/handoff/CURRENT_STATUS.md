# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: main
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 5 (P2 指示書完成 -> CC 実装待ち)
- Status: 持ち越しリストの「項目4：画面固定＆左右スクロールボタン（◀ ▶）」を中核に据えた Cycle 5 開発指示書を正式策定。スマホ版の単日カードビューを完全廃止してマトリクス表（カレンダービュー）への一本化、行・列ヘッダーの固定（Sticky）、及びヘッダー部のデッドスペースと改行解消をCC向けに指示完了。
- Next: CCが `docs/handoff/P2_AirCrew_to_CC/cycle_5_matrix_scroll_and_mobile_calendar_instructions.md` に従ってP3実装を行い、完成後、DexによるP4コードレビューを進める。
- 直近P2指示書: `docs/handoff/P2_AirCrew_to_CC/cycle_5_matrix_scroll_and_mobile_calendar_instructions.md`
- 前サイクル(C4)統合記録: `docs/handoff/P5_Dex_Integration/cycle_4_p5_integration.md`

## Read First

- AGENTS.md
- docs/handoff/CURRENT_STATUS.md
- docs/PROJECT_RULES.md
- docs/handoff/WORKFLOW_RULES.md
- 直近P2指示書: docs/handoff/P2_AirCrew_to_CC/cycle_5_matrix_scroll_and_mobile_calendar_instructions.md

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- .env、パスワード、個人情報、本物データを扱う
