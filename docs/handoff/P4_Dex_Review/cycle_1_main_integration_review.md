# [C1: Dex(P4) => CC/Agu Take2] Cycle 1 + main統合作業レビュー

## 判定

NG / Take2差し戻し。

mainと `air-cc-dev` は同一コミットとして統合されており、構文確認・フロントビルドは通っています。
ただし、重点対象の `backend/shift_solver.py` に、実データ級で登録販売者不足などの高優先制約違反を大量に残す可能性がある実装上の問題を確認しました。

## サブレビュー利用判断

不使用。
理由: 今回は差分範囲をDexが直接確認でき、ローカル再現で主要リスクを確認できたため。
ただし、自動生成ロジックは危険領域のため、Take2実装修正後にCC/Agu側セルフレビューを推奨します。

## 読んだファイル

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P4_CC_to_Dex/cycle_1_review_request.md`
- `backend/shift_solver.py`
- `backend/models.py`
- `backend/main.py`
- `frontend/src/App.jsx`
- `backend/test_solver.py`
- `docs/BACKLOG.md`

## 検証

- `git checkout main && git pull --ff-only`
- `python -m py_compile backend/main.py backend/models.py backend/shift_solver.py backend/test_solver.py`
- `python backend/test_solver.py`
- `npm --prefix frontend run build`
- 実店舗デフォルトに近い24名構成で `solve_shift()` を直接実行

結果:

- 既存 `backend/test_solver.py`: `Status: SUCCESS`
- `npm --prefix frontend run build`: 成功
- 実店舗デフォルトに近い24名構成: `FEASIBLE_WITH_WARNINGS`, warning 248件
  - 先頭警告例: `7/16: 時間帯ブロック1で登録販売者が不足しています。`

## Findings

### P1: フェーズ1がOPTIMALでない暫定解を「最小スラック」として固定してしまう

対象:

- `backend/shift_solver.py` 303-314

現在の実装では、フェーズ1で `status in [OPTIMAL, FEASIBLE]` なら `solver.Value(sum(total_slack))` を `best_slack` として固定し、フェーズ2へ進んでいます。

しかし `FEASIBLE` は「見つかった解」であり、「スラック最小が証明された解」ではありません。
実店舗デフォルトに近い入力で確認したところ、フェーズ1が十分に高優先制約を詰め切らないままフェーズ2へ進み、登録販売者不足警告が248件出ました。

これは「登録販売者絶対配置」「スラック最小化エンジン」という説明と実挙動がズレるため、Take2で修正が必要です。

推奨修正:

- フェーズ1が `OPTIMAL` の場合のみ `best_slack` として固定する。
- `FEASIBLE` の場合は、フェーズ1の探索時間を延ばす、またはフェーズ2へ進まず「高優先制約の最小化未完了」として扱う。
- もしくは、フェーズ2でも `total_slack` に十分大きい重みを残し、曜日目標や連勤抑制より高優先制約が悪化しない設計にする。
- 修正後、実店舗デフォルトに近い24名構成で登録販売者不足警告が妥当な件数まで減ることを確認する。

### P2: フェーズ2のSolve結果をstatusへ反映していない

対象:

- `backend/shift_solver.py` 313-319

フェーズ2で `solver.Solve(model)` を呼んでいますが、戻り値を `status` に保存していません。
そのためフェーズ2が `UNKNOWN` や想定外の状態でも、フェーズ1の `status` を使って後続処理が進みます。

推奨修正:

- `phase2_status = solver.Solve(model)` を受け取り、結果が `OPTIMAL` または `FEASIBLE` か確認する。
- フェーズ2が解を返せなかった場合は、フェーズ1解を使うのか、フォールバックするのか、明示的に分岐する。
- 完了報告にフェーズ1/フェーズ2それぞれのstatusを出す。

### P2: 曜日別最低人数UIは「30まで入力できる」が、solver側では平均+1の上限へ丸められる

対象:

- `frontend/src/App.jsx` 625-649
- `backend/shift_solver.py` 252-261

UIでは曜日別最低人数を0〜30まで入力できますが、solver側では `max_allowed` を超えた値が自動で丸められます。
`CURRENT_STATUS.md` にもある通り、現場の「曜日ごとの必要人数を実数で指定したい」という課題は未解決です。

これは既知の設計課題として扱ってよいですが、現状UIは「最低5名」と表示しても、実際には平均+1までしか効かない可能性があります。
次サイクルで「曜日別目標人数/最低人数の設計」を分けて見直すことを推奨します。

### P3: シフトパターン管理の重複表示・はみ出しは既知バグとして残存

対象:

- `frontend/src/App.jsx` 706-709
- `docs/handoff/CURRENT_STATUS.md` 40-42

`id` と `timeStr` が同じ自由時間シフトで `<strong>{id}</strong> : {timeStr}` と表示されるため、既知の通り重複表示になります。
これは今回の差し戻し主因ではありませんが、スマホUI品質として次回修正候補です。

## 既知課題へのDex意見

### localStorage初期データ問題

次サイクルで対応推奨です。
デフォルト従業員データを更新しても、既存端末の `shift_employees` が残ると新デフォルトが反映されません。

推奨案:

- `DATA_SCHEMA_VERSION` または `INITIAL_DATA_VERSION` を持つ。
- 保存済みlocalStorageのversionが古い場合、ユーザー確認の上で初期データへ更新できる導線を出す。
- 最低限「初期データにリセット」ボタンを用意する。

### 曜日ごとの目標人数設計

「平均±1名」固定は、現場要件と合わない可能性が高いです。
次サイクルでは、順位ではなく曜日ごとの目標人数を直接持たせる設計を推奨します。

例:

- `weekday_target_staff`: 目標人数
- `weekday_min_staff`: 最低人数
- `weekday_max_staff`: 必要なら上限

ただし、これはsolver設計に関わるため、Take2ではP1/P2のバグ修正を優先し、曜日設計は別サイクルに分けるのが安全です。

## Take2必須条件

1. フェーズ1のスラック最小化が `FEASIBLE` 暫定解で固定されないよう修正する。
2. フェーズ2のSolve戻り値を保持し、後続処理で状態を確認する。
3. 実店舗デフォルトに近い24名構成で `solve_shift()` を実行し、登録販売者不足警告の件数と代表例を報告する。
4. `python -m py_compile backend/main.py backend/models.py backend/shift_solver.py backend/test_solver.py` を通す。
5. `python backend/test_solver.py` を通す。
6. `npm --prefix frontend run build` を通す。
7. 実装変更を行う場合は、バージョン表記を `v4.11` などへ進め、完了報告に `version: v4.10 -> v4.11` を書く。

## Kazumax確認レベル

確認不要。
今回の段階ではDexレビューで差し戻し判断済みのため、Kazumaxがツールを触って確認する必要はありません。

