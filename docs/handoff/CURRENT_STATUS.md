# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `main`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 7 (P2 指示書完成 -> CC 実装待ち)
- Status: 画面周囲の過剰な余白をカットしてシフト表表示エリアを最大化し、「デフォルトでは一画面に1ヶ月がピタッとフィット表示（この時フロート矢印は非表示）」「ズームコントローラーで拡大した際に見切れた部分向けにフロートボタンを発動させる」神UI/UX改修の P2指示書 を正式策定。
- Version: 予定 v4.26
- Next: CCが `docs/handoff/P2_AirCrew_to_CC/cycle_7_zoom_and_viewport_maximization_instructions.md` を受領して P3実装および自律テストを開始。完了後、DexのP4差分レビューへ回す。
- 直近P2指示書: `docs/handoff/P2_AirCrew_to_CC/cycle_7_zoom_and_viewport_maximization_instructions.md`
- 前期(C6)統合記録: `docs/handoff/P5_Dex_Integration/cycle_6_p5_integration.md`
- Kazumax確認レベル: 確認不要

## Verification

- frontend test: 21/21 PASS（連続2回）
- time utils: 33/33 PASS
- frontend build: PASS
- 実ブラウザ: 320 / 375 / 768 / 769 / 1280px PASS
- ブラウザconsole warning/error: 0件

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P5_Dex_Integration/cycle_6_p5_integration.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- DB、保存形式、既存データ、削除、上書きに触れる
- シフト自動生成ロジックを大きく変更する
- 既存画面やAPIを広範囲に変更する
- Git conflictが発生する
- `.env`、パスワード、個人情報、本物データを扱う
