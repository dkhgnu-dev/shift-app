# P3 Take2完了報告: Cycle 1 main統合レビュー差し戻し対応

## 対応した指示

- `docs/handoff/P4_Dex_Review/cycle_1_main_integration_review.md`
- `docs/handoff/P4_Rollback/cycle_1_main_integration_take2_request.md`

## version

```text
version: v4.10 -> v4.11
```

`frontend/src/App.jsx` のバージョンバッジ2箇所（モバイルヘッダー・サイドバー）を更新。

## 修正内容（`backend/shift_solver.py`）

### P1対応: フェーズ1のFEASIBLE暫定解を無条件で固定しないよう修正

- `phase1_status`を明示的に保持し、**`OPTIMAL`の場合のみ** `sum(total_slack) <= best_slack` をハード制約として固定するように変更。
- `FEASIBLE`（未証明の暫定解）の場合はハード固定せず、フェーズ2の目的関数を `100000 * sum(total_slack) + sum(target_diff_vars) + consec_penalty_sum` とし、スラック削減を圧倒的優先度でフェーズ2でも継続するようにした（曜日目標人数・連勤抑制より確実に優先される重みを設定）。
- あわせてフェーズ1の探索時間を8.0秒→10.0秒に、フェーズ2を12.0秒→15.0秒に延長（合計25秒で従来の単一フェーズ時代の上限と同水準）。

### P2対応: フェーズ2のSolve戻り値を保持し後続処理へ反映

- `phase2_status = solver.Solve(model)` として明示的に受け取るよう変更。
- `phase2_status` が `OPTIMAL`/`FEASIBLE` の場合のみフェーズ2の解を採用。それ以外（`UNKNOWN`等）の場合は、フェーズ1終了直後に取得した解のスナップショット（`x`/`slack_contract`/`slack_rs`の値）にフォールバックするよう変更。
  - スナップショットは `solver.Value()` に依存しない単純なdictとして保持し、以降の警告生成・結果構築処理はすべてこのスナップショット経由で読むように統一（フェーズ2失敗時に無効なsolver状態を参照してしまうバグを構造的に防止）。
- 診断用に `phase1_status` / `phase2_status`（`solver.StatusName()`の文字列）をAPIレスポンスにも追加。

## 検証結果

- `python -m py_compile backend/main.py backend/models.py backend/shift_solver.py backend/test_solver.py` → 成功
- `python backend/test_solver.py` → `Status: SUCCESS`
- `npm --prefix frontend run build` → 成功
- 実店舗デフォルトに近い24名構成で `solve_shift()` を直接実行:
  - `status: SUCCESS`
  - `phase1_status: OPTIMAL`
  - `phase2_status: OPTIMAL`
  - `warnings件数: 0`（修正前レビュー時: 248件、うち登録販売者不足警告が大半）
  - 参考: あえて厳しい2名構成（契約日数の合計が明らかに達成不可能な条件）でも試験し、`FEASIBLE_WITH_WARNINGS` ＋ フォールバックなしの正常な警告生成・希望休のハード遵守（該当日が確実に「休」になること）を確認済み。クラッシュや解の不整合なし。

## Dexの推奨事項への対応状況

- 「曜日別最低人数UIが平均+1の上限へ丸められる」問題：既知の設計課題として `CURRENT_STATUS.md` に記載済み。今回のTake2スコープ外（次サイクルで曜日別目標/最低/上限人数の設計を分離して見直す）。
- 「シフトパターン管理の重複表示・はみ出し」：既知バグとして残存（今回の差し戻し主因ではないため未対応、次回修正候補）。
- localStorage初期データ問題：次サイクル対応予定として `CURRENT_STATUS.md` に記載済み。

## Kazumax確認レベル

軽い確認で十分と考えます（自動生成ロジックの数値的修正だが、Dexの指摘に沿った限定的な修正であり、検証結果は上記の通り良好です）。
