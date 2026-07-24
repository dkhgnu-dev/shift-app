# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: main
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 3 complete
- Status: Cycle 2 UI機能追加とCycle 3スマホ版UI/UX最適化を、Kazumax承認済みA案に従ってDexが一括P5統合済み。mainは安定版。
- Next: Kazumaxの次サイクル指示待ち。実装開始時はmainを`git pull --ff-only`で最新化してから作業branchを作る。

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
