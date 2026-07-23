# P3 Take3完了報告: 検証payload保存・再現性調査

## 対応した指示

- `docs/handoff/P4_Dex_Review/cycle_1_main_integration_take2_review.md`
- `docs/handoff/P4_Rollback/cycle_1_main_integration_take3_request.md`

## version

```text
version: 変更なし。理由: 検証補足のみ
```

`backend/shift_solver.py` のロジックは変更していません（後述の通り、CC側の再検証では原因を「solverロジックのバグ」と特定できなかったためです）。

## 検証コミット

```text
9b7f91b801b0593dae99615b54f70ff6ce6a31d4
（"Add Dex P4 take2 review for cycle 1 integration" 反映後、main最新）
```

## 1. 検証payloadをファイル保存

```text
docs/handoff/P3_CC_to_Dex/cycle_1_take3_solver_payload.py
```

## 2. `frontend/src/App.jsx` の `INITIAL_DATA` との一致確認

`frontend/src/App.jsx`（40〜64行目）の `INITIAL_DATA` 24名分（`name`/`type`/`isRS`/`days`/`shifts`）と、`SHIFT_MASTER`（4〜8行目）を、上記payloadスクリプトへ1件ずつ目視で突き合わせ、完全一致していることを確認しました。個人情報は含めず、イニシャル・雇用区分・登録販売者資格・契約日数・可能シフトのみを転記しています。

また、フロント側の以下のデフォルト値も同様にpayloadへ反映しています。

- `weekdayRanks` デフォルト: `{6:1, 5:2, 1:3, 2:4, 4:5, 3:6, 0:7}`
- `weekdayMinStaff` デフォルト: 全曜日 `0`（制限なし）

## 3. 実行コマンドと結果（Dexが同じコマンドで再現可能）

```bash
cd backend
python ../docs/handoff/P3_CC_to_Dex/cycle_1_take3_solver_payload.py
```

結果（2026年7月・8月それぞれ2回ずつ、計4回実行）:

```text
month=7 run=0: status=SUCCESS phase1_status=OPTIMAL phase2_status=OPTIMAL warnings_total=0 rs_warnings=0 contract_warnings=0
month=7 run=1: status=SUCCESS phase1_status=OPTIMAL phase2_status=OPTIMAL warnings_total=0 rs_warnings=0 contract_warnings=0
month=8 run=0: status=SUCCESS phase1_status=OPTIMAL phase2_status=OPTIMAL warnings_total=0 rs_warnings=0 contract_warnings=0
month=8 run=1: status=SUCCESS phase1_status=OPTIMAL phase2_status=OPTIMAL warnings_total=0 rs_warnings=0 contract_warnings=0
```

CC側環境では、月（7月／8月どちらの`currentMonth`デフォルトに相当するかの両方）・実行回数によらず、一貫して `warnings_total=0` を再現できています。

## 4. 原因分析：solverバグか実店舗制約上の不可能かの切り分け

Dexが再現した結果は次の通りでした（Take2再レビューより再掲）。

```text
status: FEASIBLE_WITH_WARNINGS
phase1_status: OPTIMAL
phase2_status: OPTIMAL
warnings: 248
```

ここで重要なのは、**両者とも`phase1_status: OPTIMAL`（証明済み最小スラック）である**という点です。`OPTIMAL`は「これ以上スラックを減らせないことが数学的に証明された」ことを意味するため、**まったく同じ入力モデルであれば、`OPTIMAL`時点のスラック値（＝警告件数）は実行環境や実行回数によらず一意に定まるはずです**。CC側で0件、Dex側で248件という差が出ている以上、以下のいずれかが起きていると考えられます。

1. **入力モデル自体が異なっている**（最も可能性が高いと判断）
   Take2完了報告では検証payloadを文章で説明しただけでファイル保存していなかったため、Dex側が別の構成（例: 更新前のINITIAL_DATA、`weekday_ranks`/`weekday_min_staff`未指定など）で再現を試みた可能性があります。Take2完了報告の「248件→0件」の"248件"という数字が、Take1のDex初回レビュー時の警告件数と完全一致している点も、Dex側の再現テストが実質的にTake1相当の条件（Take2修正前の挙動、または異なる入力）に近かった可能性を示唆しています。
2. **`backend/requirements.txt` がortoolsのバージョンを固定していないことによる環境差異**
   CC側の実行環境: `ortools==9.15.6755`。Dex側の環境で異なるバージョンがインストールされている場合、CP-SATソルバー内部の探索・増分再Solve（本実装のフェーズ1→フェーズ2で同一モデルに制約と目的関数を追加して再度`Solve()`する構成）の挙動がバージョン間で異なる可能性は理論上否定できません。ただし「同一モデルであれば`OPTIMAL`値は一意」という原則から、これが原因であれば同一バージョン間の再現性は保たれるはずで、Take3の検証（4回とも0件で安定）ではCC側の環境内非決定性は確認されませんでした。

したがって、**CC側では「solverロジック自体のバグ」を再現・特定できませんでした**。上記1（入力モデルの相違）が主因である可能性が高いと考えていますが、断定はできません。

## 推奨事項（未実施・Dex判断待ち）

- Dexには、今回保存した `docs/handoff/P3_CC_to_Dex/cycle_1_take3_solver_payload.py` をそのまま実行して再現するかご確認をお願いしたいです。これで0件になった場合は「Take2完了報告時点での入力モデル相違」が確定します。それでも248件になった場合は「環境差異（ortoolsバージョン等）」の切り分けに進む必要があります。
- 再現性の担保として、`backend/requirements.txt` に `ortools==9.15.6755`（CC側で動作確認済みのバージョン）を明記することを推奨します。今回は実装判断（本番デプロイ済みバージョンとの整合性）に関わるため、CC単独では変更せず提案のみとしました。

## 必須検証チェックリスト

- `python -m py_compile backend/main.py backend/models.py backend/shift_solver.py backend/test_solver.py` → 成功
- `python backend/test_solver.py` → `Status: SUCCESS`
- `npm --prefix frontend run build` → 成功
- 保存したpayloadでの `solve_shift()` 実行（4回）→ 上記の通り全て `warnings_total=0`

## Kazumax確認レベル

確認不要。今回は検証・原因調査のみで、実装ロジックの変更は行っていません。
