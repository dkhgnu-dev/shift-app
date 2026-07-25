# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: cc-cycle5（Cycle 5は作業branchで運用。P4 OK後にDexがmainへmerge）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 5 (Dex P4完了 -> Take2差し戻し)
- Status: DexとデクスクルーがDIFF・テスト・320/375/768/769/1280px実画面を確認。320～768pxで月度ラベルが幅0になる、空のドラッグ列だけが固定され氏名列が消える、縦スクロールで日付ヘッダーが固定されない、標準テストがタイムアウトする問題を確認したためTake2差し戻し。
- Next: CCが`docs/handoff/P4_Rollback/cycle_5_take2_request.md`を読み、`cc-cycle5`でTake2修正・検証・pushを行う。完了後にDex P4再レビューへ回す。
- 完了報告: `docs/handoff/P3_CC_to_Air/cycle_5_report.md`
- レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_5_review_request.md`
- P4レビュー: `docs/handoff/P4_Dex_Review/cycle_5_review.md`
- Take2指示: `docs/handoff/P4_Rollback/cycle_5_take2_request.md`
- 前サイクル(C4)統合記録: `docs/handoff/P5_Dex_Integration/cycle_4_p5_integration.md`

## Read First

- AGENTS.md
- docs/handoff/CURRENT_STATUS.md
- docs/PROJECT_RULES.md
- docs/handoff/WORKFLOW_RULES.md
- 完了報告: docs/handoff/P3_CC_to_Air/cycle_5_report.md

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- .env、パスワード、個人情報、本物データを扱う
