# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: cc-cycle4（Cycle 4は作業branchで運用。P4 OK後にDexがmainへmerge）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 4 (Take2 Dex P4 OK -> P5 main統合待ち)
- Status: DexがTake2のDIFF、自動テスト13件、時間処理33件、build、320/375/768/769/1280px実画面を確認。リセット時の生成済みシフト破棄、上位3名だけの鍵持ち表示、v4.20を確認し、P4 OK。
- Next: Dex(P5)がレビュー済みHEAD `141cd2d` とmerge対象の一致を確認し、mainをpull --ff-only後に`cc-cycle4`をmerge・pushする。
- 完了報告(Take2): `docs/handoff/P3_CC_to_Dex/cycle_4_take2_report.md`
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_4_review.md`
- Take2レビュー: `docs/handoff/P4_Dex_Review/cycle_4_take2_review.md`
- Take2指示: `docs/handoff/P4_Rollback/cycle_4_take2_request.md`

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
