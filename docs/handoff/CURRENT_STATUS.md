# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `main`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 7 (P2 指示書完成 -> CC 実装待ち)
- Status: スマホ版（768px未満）の左固定列の約半分割譲問題を解消するため、「左固定列を100〜110pxへ圧縮・ドラッグハンドル全削除・サブ情報を名前セルタップの軽量ポップオーバー/ドロワーへ集約」「スマホ時はフロートボタン全カットでスワイプ特化」及び「PC版の一画面フィット・ズーム連動フロートスクロール」の完全極上の P2指示書 を策定完了。
- Version: 予定 v4.26
- Next: CCが `docs/handoff/P2_AirCrew_to_CC/cycle_7_zoom_and_viewport_maximization_instructions.md` を受領して P3実装・テストに突入。完了後、DexのP4差分レビューへ回す。
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
