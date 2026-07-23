# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Main agent: Air / CC / エアクルー（Air Crew）＋ 友達側AIエージェント「アグ」
- External reviewer: エアクルー (Air Crew) ※Dex制限中の代用

## Current State

- Cycle: 1
- Status: `air-cc-dev`（Air/CC担当のCycle 1: スマホUI最適化・シフトパターン柔軟化・16日〜15日締め対応）と、`main`（アグ担当のv4.8: 多段階最適化・スラック自動診断エンジン）を統合し、`main` へマージ・push完了。
- Next: 統合後の `main` を友達（アグ）側で `git pull` して取り込んでもらう。以後は force-push を避け、通常の pull → push フローで運用する。

## 実装済み機能（統合後）

### バックエンド (`backend/shift_solver.py`)
- 多段階（辞書順）最適化＋スラック自動診断エンジン（アグ担当・v4.8）
  - 希望休100%絶対厳守、連勤上限（社員5連勤/パート4連勤）、契約日数遵守、出勤人数「平均±1名以内」の厳格制限、登録販売者絶対配置、1日出勤上限70%、曜日順位（1位〜7位）による人員配分、月末抽選会、100%失敗しないフォールバック処理。
- `shift_types`（`start_time`/`end_time`）から時間帯ブロック(B1〜B10)を動的判定する仕組み（Air/CC担当）
  - 従来の①〜⑪固定シフトIDに加え、カスタムシフトパターン・自由時間シフトでも登録販売者カバレッジ判定が正しく機能する。
- 前月16日〜当月15日締めの期間・曜日判定（Air/CC担当）

### フロントエンド (`frontend/src/App.jsx`)
- v4.8: 曜日ごとの出勤優先順位(1位〜7位)設定UI、AI自動診断アドバイスパネル（動的warnings表示）、統合ルール一覧表示、バージョンバッジ
- Air/CC: スマホ用ハンバーガードロワー、`shiftMaster`によるカスタムシフトパターン管理・自由時間指定、16日〜15日締めの日付/曜日表示

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- バックログ: `docs/BACKLOG.md`

## Stop Conditions

以下の場合は勝手に進めず、人間へ確認してください。

- DB、保存形式、既存データ、削除、上書きに触る
- シフト自動生成ロジックを大きく変える
- 既存の画面やAPIを広範囲に変更する
- Git conflictが出た
- `.env`、パスワード、個人情報、本物データを扱う

## 次の課題・検討事項 (Next Actions)

1. **DB連携の導入 (Supabase または PostgreSQL/SQLite等)**：現在のデータ保存はブラウザのLocalStorageに依存しているため、端末間でのシフト共有やログイン機能の追加。
2. **シフトのエクスポート機能**：確定したシフトを印刷・配布できるよう、CSVやPDF/画像出力機能の追加。
3. `docs/BACKLOG.md` 参照（年末短縮営業、鍵管理スタッフの割り当て等）。
