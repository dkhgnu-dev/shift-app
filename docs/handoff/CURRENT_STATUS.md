# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: cc-cycle5（Cycle 5は作業branchで運用。P4 OK後にDexがmainへmerge。main未merge）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: Dex

## Current State

- Cycle: 5 (Take3実装完了、`cc-cycle5`へpush済み -> Dex P4再レビュー待ち)
- Status: Dex P4がTake2をNG(`1567833`)とし、1列目の実幅45px(全セル共通min-width)と2列目`left:40px`の5px重複をTake3差戻し(`1df48c5`)。CCが1列目をwidth/min-width/max-width:40pxで厳密固定し解消、v4.23化。`npm test`連続2回で17件全PASS、`node test_time_utils.mjs`(33件)・`npm run build`も成功。
- Status(重要): このセッションのBrowserペインが別プロジェクト(`シフト`)に固定されていることを確認（`友達シフト`の`.claude/launch.json`のport:5173指定が無視され、別プロジェクト向けport:5174の設定が起動してしまう）。Kazumax承認のもと、**今回もブラウザ実機での座標実測は未実施**。CSS仕様上の計算根拠のみで対応し、実機確認をDex/Kazumaxに依頼している。
- Next: Dex(P4)が`cc-cycle5`のTake3をレビューし、実機で320/375/768/769/1280pxの座標を確認する。OKならDex(P5)がmainへmergeする（**main未merge**）。
- 完了報告(Take3): `docs/handoff/P3_CC_to_Dex/cycle_5_take3_report.md`
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_5_take2_review.md`
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
