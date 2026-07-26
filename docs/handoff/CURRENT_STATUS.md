# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: cc-cycle6（Cycle 6は作業branchで運用。P4 OK後にDexがmainへmerge）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 6 (Dex P4 NG -> Take2修正待ち)
- Status: Dexが`bdc4d5a`をDIFF・実ブラウザレビュー。320pxで左右ボタンが37px重なり左へ戻れない、別タブ復帰後に端状態が古い、透明ボタンがキーボード操作可能、テストのprototype上書き未復元を確認。
- Next: CC(P3)が`docs/handoff/P4_Rollback/cycle_6_take2_request.md`を読み、v4.25 Take2を実装・検証して`cc-cycle6`へpushする。
- 完了報告: `docs/handoff/P3_CC_to_Air/cycle_6_report.md`
- レビュー依頼: `docs/handoff/P4_CC_to_Dex/cycle_6_review_request.md`
- P4レビュー: `docs/handoff/P4_Dex_Review/cycle_6_review.md`
- Take2指示: `docs/handoff/P4_Rollback/cycle_6_take2_request.md`
- 前期(C5)統合報告: `docs/handoff/P5_Dex_Integration/cycle_5_p5_integration.md`

## Read First

- AGENTS.md
- docs/handoff/CURRENT_STATUS.md
- docs/PROJECT_RULES.md
- docs/handoff/WORKFLOW_RULES.md
- 完了報告: docs/handoff/P3_CC_to_Air/cycle_6_report.md

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- .env、パスワード、個人情報、本物データを扱う
