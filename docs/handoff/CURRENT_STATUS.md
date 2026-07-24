# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Working Branch: `air-cc-dev` （※mainへの衝突防止のため専用ブランチで運用中）
- Main agent: Air / CC / エアクルー（Air Crew）
- External reviewer: エアクルー (Air Crew) ※Dex制限中の代用

## Current State

- Cycle: 2
- Status: Airの無断コード修正をキャンセル（revert）完了。マニュアルへの「Air直接実装の原則禁止＆指示書と壁打ちの混同防止」ルールを追記・同期済み。CC向けにタイムピッカーハイブリッド化＆☀️/🌙鍵持ちアイコン表示のP2指示書を作成完了
- Next: CCが `air-cc-dev` ブランチ上で `docs/handoff/P2_AirCrew_to_CC/cycle_2_ui_enhancements_instructions.md` に従って実装(P3)・検証・プッシュを行う

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- 今回の指示書: `docs/handoff/P2_AirCrew_to_CC/cycle_2_ui_enhancements_instructions.md`
- バックログ: `docs/BACKLOG.md`

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- `.env`、パスワード、個人情報、本物データを扱う
