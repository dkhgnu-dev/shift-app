# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: main（Cycle 4統合完了）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 4 (完了、P4 OK・P5 main統合済み)
- Status: DexがTake2のDIFF、自動テスト13件、時間処理33件、build、320/375/768/769/1280px実画面を確認。リセット時の生成済みシフト破棄、上位3名だけの鍵持ち表示、v4.20を確認し、`cc-cycle4`をconflictなしでmainへfast-forward統合した。
- Next: Kazumax/Airが次サイクルの要否と内容を決める。Cycle 4について追加作業なし。
- 完了報告(Take2): `docs/handoff/P3_CC_to_Dex/cycle_4_take2_report.md`
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_4_review.md`
- Take2レビュー: `docs/handoff/P4_Dex_Review/cycle_4_take2_review.md`
- Take2指示: `docs/handoff/P4_Rollback/cycle_4_take2_request.md`
- P5統合記録: `docs/handoff/P5_Dex_Integration/cycle_4_p5_integration.md`

## Read First

- AGENTS.md
- docs/handoff/CURRENT_STATUS.md
- docs/PROJECT_RULES.md
- docs/handoff/WORKFLOW_RULES.md
- 完了報告: docs/handoff/P3_CC_to_Air/cycle_4_report.md
- 直近統合記録: docs/handoff/P5_Dex_Integration/cycle_2_3_p5_integration.md

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- .env、パスワード、個人情報、本物データを扱う
