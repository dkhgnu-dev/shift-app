# P3 実装報告書: Cycle 1 スマホUI最適化 & シフトパターン柔軟化 & 16日〜15日締め対応

## 対応した指示書

`docs/handoff/P2_AirCrew_to_CC/cycle_1_mobile_and_flexible_shifts_instructions.md`

## 作業ブランチについて（重要）

当初 `main` への直接pushを試みたところ、**友達側のAIエージェント「アグ」が並行して `main` に force-push を含む形で作業しており**、`shift_solver.py`/`App.jsx` で以下の別機能とファイルレベルで衝突することが判明しました。

- アグ側: 辞書式最適化（Lexicographic Optimization）とスラック変数によるソフト制約化・診断機能（`weekday_ranks`、70%出勤上限、月末抽選会日数の可変化など）
- CC側（本報告書の内容）: shift_types動的ブロック判定、16日〜15日締め対応、カスタムシフトパターン管理、スマホUI

一度は両機能を手動で組み合わせるマージを試みましたが、作業中もアグ側が `shift_solver.py` に対してバグ修正コミットを継続的にpushしており（「追いかけてもキリがない」状態）、Airの判断で **`air-cc-dev` という専用ブランチを新設し、CC側の作業はそちらに隔離する運用**に変更されました。

## 追記: mainへの統合完了（友達の作業一時停止後）

Kazumaxさんが友達（アグ）に作業を一時停止してもらい、その間に改めて統合を実施しました。

1. `git merge origin/main --allow-unrelated-histories` で `origin/main`（アグ側 v4.8: 辞書式最適化・スラック自動診断エンジン）を `air-cc-dev` に取り込み、`backend/shift_solver.py` / `backend/models.py` / `frontend/src/App.jsx` / `frontend/src/index.css` / `AGENTS.md` / `docs/PROJECT_RULES.md` / `docs/handoff/WORKFLOW_RULES.md` / `docs/handoff/CURRENT_STATUS.md` のコンフリクトを手動解決。
   - `shift_solver.py`: アグ側の多段階最適化・スラック診断・連勤上限の雇用形態別差別化（社員5連勤/パート4連勤）・100%フェイルセーフフォールバックの構造を維持しつつ、CC側の `build_shift_coverage`（動的ブロック判定）・`get_period_start`/`get_period_end`（16-15日締め）を組み込み。あわせてアグ側コードに残っていた `emp.days`（存在しないフィールド）参照バグを `emp.contract_days` に修正。
   - `App.jsx`: アグ側の `weekdayRanks` UI・v4.8バッジ・動的診断警告パネル・`employment_type` 送信と、CC側の `shiftMaster` カスタムシフト管理・自由時間入力・16-15日締め期間表示を統合。
   - `AGENTS.md`/`docs/PROJECT_RULES.md`/`docs/handoff/WORKFLOW_RULES.md`: Air主導のair-cc-dev運用ルール（こちら側）を採用。
   - `docs/handoff/CURRENT_STATUS.md`: 両者の実装内容を反映した内容に書き直し。
2. 直後にアグ側がさらに1コミット（`bc10b78`: 辞書順最適化のモデル宣言一括化・解法安定性修正）をpushしていたため、これも追って取り込み、同じ目的の修正をCC側の期間ベース日付計算を保った形で反映。
3. `npm run build`・`python -m py_compile`・`solve_shift()` の統合テスト（雇用形態別連勤上限・カスタムシフトのブロックカバレッジ・16-15日締め期間の希望休判定）・ブラウザでのUI表示確認をすべて実施し、問題なし。
4. `git push origin air-cc-dev` → `git push origin air-cc-dev:main`（fast-forward）で `main` への反映が完了。

統合後は `main` に両機能（アグ側v4.8エンジン＋CC側Cycle 1機能）が共存しています。友達（アグ）側は次回作業開始時に `git pull` で取り込んでください。

## 変更ファイル

- `backend/shift_solver.py`
- `backend/main.py`（変更なし・確認のみ）
- `frontend/src/App.jsx`
- `frontend/src/index.css`
- `.claude/launch.json`（新規追加・開発サーバープレビュー用）

## 実装内容

### 1. バックエンド (`backend/shift_solver.py`)

- `time_to_minutes()` / `build_shift_coverage()` を追加し、`input_data.shift_types` の `start_time`/`end_time` から時間帯ブロック(B1〜B10、指示書の分換算定義どおり)を動的判定するようにした。従来ハードコードしていた `shift_coverage` 辞書は削除。
- `get_period_start()` / `get_period_end()` を追加し、`year`/`month` から「前月16日〜当月15日」の対象期間を算出。`num_days` と各日の `weekday()` 判定をこの期間ベースに変更。
- `requests_off` の日付判定を「日付文字列(`YYYY-MM-DD`)を `start_date` からの通算日数に変換」する方式に変更（旧実装は日付文字列の日部分をそのまま月内日番号として扱っており、月跨ぎ期間では成立しなかった）。

### 2. バックエンド (`backend/main.py`)

`ShiftInput`/`ShiftType`（`models.py`）は元々 `shift_types: List[ShiftType]`（`start_time`/`end_time` 含む）を受け取れる構造で、`main.py` はそのまま `solve_shift(input_data)` に渡しているだけだったため、**追加の変更は不要**と判断（確認のみ）。

### 3. フロントエンド (`frontend/src/App.jsx`)

- `getPeriodDates(year, month)` ヘルパーを追加し、前月16日〜当月15日の `Date` 配列を生成。ダッシュボードの表ヘッダー・モバイル日付ナビ・設定タブの「人員を厚くしたい日」を、旧来の `daysInMonth`/`firstDayOfWeek`（月内単純ループ）からこの期間ベースの計算に置き換え。
- ヘッダーに対象期間（例: `6/16〜7/15 締め`）を表示するよう追加。
- `shiftMaster` ステートを導入。`localStorage.getItem('shift_custom_master')` から安全にパース（`safeParse` ヘルパーで壊れたJSONでもクラッシュしないようにフォールバック）して読み込み、変更時に保存。初期値は既存の `SHIFT_MASTER`。
- 「ルール設定」タブに「シフトパターン管理（カスタム追加）」セクションを新設。パターン名・開始/終了時刻を入力して追加、既存パターンを削除できる。
- 従業員編集モーダルに「自由時間を入力」チェックボックスを追加。開始/終了の `<input type="time">` から自由時間を追加すると、`shiftMaster` に自動登録され、選択中シフトのバッジ一覧に追加される（バッジからワンクリックで解除可）。
- `generateShift()` の `shift_types` 生成元を `SHIFT_MASTER` → `shiftMaster` に変更。`requests_off` の日付も `periodDates` を使って正しい絶対日付(`YYYY-MM-DD`)に変換して送信するよう修正（旧実装は月内日番号をそのまま `year-month-day` に埋めており、月跨ぎ期間では誤った日付になっていた）。
- 希望休（`requests`）・繁盛日（`thickDays`）は「対象期間内の通算番号（1始まり）」として扱う設計とし、UI上の繁盛日トグルボタンには実際の日付（例: `7/16`）を表示するよう変更（意味の分かりやすさのため）。
- 既存の `SHIFT_MASTER[...]` 参照箇所（動的にシフト内容が変わりうる場所）を `shiftMaster[...]` に置き換え。正社員などの固定枠説明（④・⑦など）は元々固定コードのため `SHIFT_MASTER` 参照のまま維持。
- 副次的に見つけた表示バグ（自由時間シフトが従業員一覧で `08:00～11:00 08:00～11:00` のように二重表示される）を修正。

### 4. フロントエンド (`frontend/src/index.css`)

- `.modal-overlay` の `z-index` を `50` → `200` に変更。ドロワー(`.sidebar`: 100)・オーバーレイ(`.sidebar-overlay`: 90)は指示書の値と既に一致していたため変更なし。ドロワーの開閉ロジック（ハンバーガー・オーバーレイタップでの close）も実装済みだったため変更なし。

## 検証内容

- `python -m py_compile` でバックエンド構文チェックOK。
- `npm run build`（Vite）でフロントエンドのビルドが成功することを確認（`node_modules` は今回新規に `npm install` 済み）。
- `frontend/.claude/launch.json` を新規作成し、`友達シフト/frontend` を別ポート(5174)でローカル起動してブラウザ実機検証:
  - ルール設定タブでシフトパターン「中番 13:00〜17:00」を追加 → `localStorage['shift_custom_master']` に正しく保存されることを確認。
  - 従業員編集モーダルで「自由時間を入力」から `08:00〜11:00` を追加 → バッジ表示・`shiftMaster` への自動登録・従業員保存後の一覧表示（重複表示バグ修正済み）を確認。
  - モバイル幅(375px)でハンバーガーメニュー・オーバーレイの開閉、`z-index`（sidebar:100 / overlay:90）を確認。ドロワーの `left` プロパティは本プレビュー環境がタブを非表示のままcompositingしないためCSSトランジション中の値が凍結される現象があったが、トランジションを無効化した状態で `left: -300px → 0px` に正しく切り替わることを直接確認済み（実ブラウザでは通常通りアニメーションする想定）。
  - 設定タブの「人員を厚くしたい日」が `6/16〜7/15` の実日付表示になっていることを確認。
- バックエンドロジックの単体検証（`ortools` を新規インストールして実施）:
  - `build_shift_coverage()` が旧ハードコード `shift_coverage` 辞書と完全一致する結果を返すことを確認（①〜⑪相当の11パターンで検証）。
  - カスタムシフト `13:00〜17:00` が正しくブロック `[3, 4, 5]` のみをカバーすると判定されることを確認。
  - `get_period_start(2026, 8)` → `2026-07-16`、`get_period_end(2026, 8)` → `2026-08-15`、年またぎ（`get_period_start(2026, 1)` → `2025-12-16`）も正常。
  - `solve_shift()` をモックデータ（従業員2名・カスタムシフト含む）で実行し `SUCCESS` を確認。対象期間の日数（31日）、契約日数の遵守、`requests_off` で指定した日付（期間内の実際の初日）が正しく「休」になることを確認。
- 実際のシフト自動生成API呼び出し（フロント→本番バックエンド `https://shift-app-rw01.onrender.com`）は、本番側に今回の変更が未デプロイのため未検証。デプロイ後に本番環境での生成確認が必要。

## まだ不安な点・Dexに見てほしい点

- **シフト自動生成ロジックに直接手を入れています**（`shift_coverage` の動的化、日付/曜日判定の期間ベース化）。`PROJECT_RULES.md`/`WORKFLOW_RULES.md` の「危険領域」に該当するため、Dexレビューを推奨します。
- `requests_off` の日付解釈を「日付文字列→通算日数」に変更したことで、既存の保存済みデータ（もしあれば）との互換性は破壊的変更です（旧仕様では月内日番号として扱っていたため）。今回はlocalStorageの `shift_employees`/`shift_generatedResult` 等の構造自体は変えていませんが、`requests`（希望休の入力欄の数字）の**意味**が「月内の日付」から「対象期間(前月16日始まり)内の通算番号」に変わっています。既存ユーザーが入力済みの希望休データがある場合、意味がズレる可能性があるため、運用切り替え時の周知が必要です。
- 本番バックエンド（Render）への未デプロイのため、実際のシフト生成API呼び出しでの動作は未確認です。
- カスタムシフトパターンを従業員が使用中に削除した場合の挙動は「フォールバック表示（IDそのまま表示）」のみ対応し、削除時の警告や参照チェックは未実装です（指示書のスコープ外と判断）。

## 未対応・スコープ外とした点

- `backend/main.py` はモデル構造上すでに `shift_types` を受け渡せていたため変更していません。
- 土曜/火水の時間帯優先ボーナス（`shift_solver.py` 内 `weekday in [1,2]` / `weekday == 5` の加点ロジック）は元々固定シフトID(①〜⑪等)を直接参照しているため、カスタムシフトIDには適用されません。指示書に明記された変更対象ではないため今回はそのままにしています。
