# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Main agent: Air / CC / エアクルー（Air Crew）＋ 友達側AIエージェント「アグ」
- External reviewer: エアクルー (Air Crew) ※Dex制限中の代用

## Current State

- Cycle: 1
- Status: v4.9リリース完了。main ブランチへ push 済み。
- Next: Render自動デプロイ後に動作確認。

## 実装済み機能（統合後）

### バックエンド (`backend/shift_solver.py` / `backend/models.py`)
- 多段階（辞書順）最適化＋スラック自動診断エンジン（アグ担当・v4.9）
  - 希望休100%絶対厳守、連勤上限（社員5連勤/パート4連勤）、契約日数遵守
  - 出勤人数「平均±1名以内」のハード制約（均等化ペナルティなし・順位配分が機能する構造）
  - 登録販売者絶対配置、1日出勤上限70%
  - 曜日順位（1位〜7位）による人員配分（上位+1名/中位ピッタリ/下位-1名）
  - **【v4.9新機能】正社員・準社員の5連勤ソフト抑制（極力避ける）**
  - **【v4.9新機能】パート等の4連勤ソフト抑制（極力避ける）**
  - **【v4.9新機能】曜日別最低出勤人数ハード制約（weekday_min_staff）**
  - 月末抽選会、100%失敗しないフォールバック処理
- `shift_types` から時間帯ブロック(B1〜B10)を動的判定（Air/CC担当）
- 前月16日〜当月15日締めの期間・曜日判定（Air/CC担当）

### フロントエンド (`frontend/src/App.jsx`)
- v4.9: バージョンバッジ、**曜日別最低出勤人数の設定UI（0=制限なし）**
- v4.8: 曜日ごとの出勤優先順位(1位〜7位)設定UI、AI自動診断アドバイスパネル、統合ルール一覧表示
- Air/CC: スマホ用ハンバーガードロワー、カスタムシフトパターン管理、16日〜15日締めの日付/曜日表示

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
