# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: dkhgnu-dev/shift-app
- Main agent: Air / CC / エアクルー（Air Crew）＋ 友達側AIエージェント「アグ」
- External reviewer: Dex（復帰）

## Current State

- Cycle: 1
- Status: Dex(P4) Take2再レビューでTake3差し戻し。Take2完了報告の「実店舗24名構成で登録販売者不足警告248件→0件」をDex側で再現できず。
- Next: CC/Aguが `docs/handoff/P4_Rollback/cycle_1_main_integration_take3_request.md` と `docs/handoff/P4_Dex_Review/cycle_1_main_integration_take2_review.md` を読み、検証payload保存・再現条件確認・必要修正を行う。

## 実装済み機能（統合後）

### バックエンド (`backend/shift_solver.py` / `backend/models.py`)
- 多段階（辞書順）最適化＋スラック自動診断エンジン（アグ担当・v4.10、Take2でCCがP1/P2バグ修正）
  - **【Take2修正】フェーズ1が`OPTIMAL`の場合のみスラックをハード固定。`FEASIBLE`の場合はフェーズ2でも圧倒的重みでスラック削減を継続。フェーズ2のSolve戻り値を明示的に判定し、失敗時はフェーズ1解へフォールバック。ただしDex再レビューでは実店舗24名構成の警告0件を再現できず、Take3で検証payload保存・再現条件確認が必要。**
  - 希望休100%絶対厳守、連勤上限（社員5連勤/パート4連勤）、契約日数遵守
  - **【v4.10新機能】連休制限ルール（希望休は対象外）**
    - 正社員・時間限定社員・準社員: AI自動割当での**3連休以上を絶対禁止（最大2連休まで）**
    - パート・アルバイト等: **3連休まで通常**, **4連休はソフト抑制**, **5連休以上は絶対禁止**
  - 【v4.9新機能】正社員・準社員の5連勤ソフト抑制、パート等の4連勤ソフト抑制
  - 【v4.9新機能】曜日別最低出勤人数ハード制約（`weekday_min_staff`）
  - 出勤人数「平均±1名以内」のハード制約（均等化ペナルティなし・順位配分が機能する構造）
  - 登録販売者絶対配置、1日出勤上限70%
  - 曜日順位（1位〜7位）による人員配分（上位+1名/中位ピッタリ/下位-1名）
  - 月末抽選会、100%失敗しないフォールバック処理
- `shift_types` から時間帯ブロック(B1〜B10)を動的判定（Air/CC担当）
- 前月16日〜当月15日締めの期間・曜日判定（Air/CC担当）

### フロントエンド (`frontend/src/App.jsx`)
- v4.9: バージョンバッジ、**曜日別最低出勤人数の設定UI（0=制限なし）**
- v4.8: 曜日ごとの出勤優先順位(1位〜7位)設定UI、AI自動診断アドバイスパネル、統合ルール一覧表示
- Air/CC: スマホ用ハンバーガードロワー、カスタムシフトパターン管理、16日〜15日締めの日付/曜日表示

## 既知の未修正バグ（実装未着手・Dexレビュー対象）

1. デフォルト従業員データ更新時、`localStorage`に既存データが残っている端末では新デフォルトが反映されない（PC/スマホでlocalStorageが別々のため端末ごとにクリアが必要）。恒久対策は「初期データにリセット」ボタンやデータバージョニングを検討中。
2. 「ルール設定」タブの「シフトパターン管理」一覧で、自由時間シフト（IDと表示文字列が同一）が `id : timeStr` の重複表示になり、スマホ幅で枠からはみ出す。従業員一覧テーブルでは同種のバグを修正済みだが、この一覧は未適用。
3. （設計課題・未実装）曜日ごとの目標人数が「月内平均±1名」の枠に縛られており、現場の「日によって必要人数が大きく違う」実態と合わず、「均等すぎる」「逆に偏る」という声が出ている。詳細は `docs/handoff/P4_CC_to_Dex/cycle_1_review_request.md` を参照。

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- P4レビュー: `docs/handoff/P4_Dex_Review/cycle_1_main_integration_review.md`
- 差し戻し: `docs/handoff/P4_Rollback/cycle_1_main_integration_take2_request.md`
- P4再レビュー: `docs/handoff/P4_Dex_Review/cycle_1_main_integration_take2_review.md`
- Take3差し戻し: `docs/handoff/P4_Rollback/cycle_1_main_integration_take3_request.md`
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
