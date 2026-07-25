# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: cc-cycle5（Cycle 5は作業branchで運用。P4 OK後にDexがmainへmerge。main未merge）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 5 (Take3 Dex P4 OK -> Dex P5統合待ち)
- Status: Dexが`aa50aa8`をDIFFレビューし、320/375/768/769/1280pxの実ブラウザで固定列境界を実測。全幅で1列目40px、2列目との境界差0px、横350px・縦420pxスクロール後も固定正常。月度表示、背景、既存タブ、consoleも異常なし。自動テスト17件×2周、時刻33件、build成功。
- Next: Dex(P5)がmainを`git pull --ff-only`で最新化し、レビュー済みcc-cycle5をmerge/pushする。
- 完了報告(Take3): `docs/handoff/P3_CC_to_Dex/cycle_5_take3_report.md`
- P4レビュー: `docs/handoff/P4_Dex_Review/cycle_5_take3_review.md`
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
