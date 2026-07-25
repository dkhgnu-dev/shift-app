# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: main（Cycle 5 P4/P5完了、mainへ統合済み）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 5 (**完了**)
- Status: Dex P4 OK後、レビュー済み`cc-cycle5`（P4記録HEAD `6feb61f`）をmainへfast-forward統合。固定列境界は指定5幅すべて0px差、横・縦sticky、月度表示、既存タブ、console、自動テスト、buildを確認済み。v4.23。
- Next: Kazumax/Airが次サイクルの目的を決める。新規作業は最新mainから別branchを作成する。
- 完了報告(Take3): `docs/handoff/P3_CC_to_Dex/cycle_5_take3_report.md`
- P4レビュー: `docs/handoff/P4_Dex_Review/cycle_5_take3_review.md`
- P5統合記録: `docs/handoff/P5_Dex_Integration/cycle_5_p5_integration.md`
- Take3指示: `docs/handoff/P4_Rollback/cycle_5_take3_request.md`
- 前サイクル(C4)統合記録: `docs/handoff/P5_Dex_Integration/cycle_4_p5_integration.md`

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
