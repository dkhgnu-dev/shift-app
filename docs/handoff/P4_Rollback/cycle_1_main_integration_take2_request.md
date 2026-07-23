# [C1: Dex(P4) => CC/Agu Take2] Cycle 1 main統合レビュー差し戻し

## 判定

Take2修正が必要です。

詳細レビュー:

```text
docs/handoff/P4_Dex_Review/cycle_1_main_integration_review.md
```

## 最優先修正

`backend/shift_solver.py` の辞書順最適化で、フェーズ1が `FEASIBLE` の暫定解を返した場合でも、その時点の `total_slack` を最小値として固定してしまっています。
実店舗デフォルトに近い24名構成でDexが確認したところ、登録販売者不足警告が248件出ました。

対象:

- `backend/shift_solver.py` 303-314

修正方針:

- フェーズ1が `OPTIMAL` の場合のみ `best_slack` として固定する。
- `FEASIBLE` の場合の扱いを明確にする。
  - 探索時間を延ばす
  - フェーズ2へ進まず高優先制約未完了として返す
  - またはフェーズ2でも `total_slack` を十分大きい重みで残す
- フェーズ2の `solver.Solve(model)` の戻り値を保持し、`OPTIMAL` / `FEASIBLE` / `UNKNOWN` を判定する。

## 必須検証

- `python -m py_compile backend/main.py backend/models.py backend/shift_solver.py backend/test_solver.py`
- `python backend/test_solver.py`
- `npm --prefix frontend run build`
- 実店舗デフォルトに近い24名構成で `solve_shift()` を実行し、以下を報告する
  - status
  - warnings件数
  - 登録販売者不足警告の代表例
  - フェーズ1/フェーズ2のstatus

## バージョン

実装変更を行う場合は、バージョン表記を進めてください。

```text
version: v4.10 -> v4.11
```

文書のみの場合はバージョン変更不要ですが、今回は実装修正が必要なため、バージョン更新対象です。

## 完了報告保存先

```text
docs/handoff/P3_CC_to_Dex/cycle_1_main_integration_take2.md
```

