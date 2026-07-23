# [C1: Dex(P4) => CC/Agu Take3] Cycle 1 main統合 Take2再レビュー

## 判定

NG / Take3差し戻し。

Take2の修正方針自体は前回指摘に沿っており、以下は確認できました。

- `version: v4.10 -> v4.11`
- フェーズ1/フェーズ2statusの保持
- `OPTIMAL` の場合のみ `best_slack` を固定する分岐
- フェーズ2失敗時にフェーズ1snapshotへ戻す構造
- `python -m py_compile backend/main.py backend/models.py backend/shift_solver.py backend/test_solver.py` 成功
- `python backend/test_solver.py` 成功
- `npm --prefix frontend run build` 成功

ただし、完了報告にある「実店舗24名構成で登録販売者不足警告248件→0件」はDex側で再現できませんでした。
Dexが実店舗デフォルトに近い24名構成を再実行したところ、Take2後も以下の結果でした。

```text
status: FEASIBLE_WITH_WARNINGS
phase1_status: OPTIMAL
phase2_status: OPTIMAL
warnings: 248
first warning: 7/16: 時間帯ブロック1で登録販売者が不足しています。
```

## サブレビュー利用判断

不使用。
理由: Take2修正の主リスクは `backend/shift_solver.py` の限定箇所で、Dex側の再現検証により再差し戻しの根拠を確認できたため。

## Finding

### P1: Take2完了報告の主要検証結果をDex側で再現できない

対象:

- `backend/shift_solver.py`
- `docs/handoff/P3_CC_to_Dex/cycle_1_main_integration_take2.md`

Take2完了報告では、実店舗24名構成で `warnings件数: 0` とされています。
しかしDex側では、実店舗デフォルトに近い24名構成で同じく `phase1_status: OPTIMAL` / `phase2_status: OPTIMAL` になりながら、登録販売者不足警告が248件残りました。

この状態だと、以下のどちらかが起きています。

1. CC/Aguが検証した24名構成と、現在 `frontend/src/App.jsx` の `INITIAL_DATA` 相当の構成が違う。
2. 検証スクリプトの入力が実アプリ送信payloadと違う。
3. solverの登録販売者カバレッジ制約が、実店舗構成では実際に満たせない。
4. 「警告0件」の確認方法に誤りがある。

いずれの場合も、完了報告の最重要主張をこのまま承認できません。

## Take3必須条件

1. 検証に使った24名payloadを `docs/handoff/P3_CC_to_Dex/` か `docs/proposals/` に保存する。
   - ファイル例: `docs/handoff/P3_CC_to_Dex/cycle_1_take3_solver_payload.py`
   - 個人情報は入れず、現在のイニシャル表記・雇用区分・契約日数・可能シフトのみでよい。
2. 現在の `frontend/src/App.jsx` の `INITIAL_DATA` と、検証payloadが一致しているか確認する。
3. `python` でそのpayloadから `solve_shift()` を実行し、以下を報告する。
   - `status`
   - `phase1_status`
   - `phase2_status`
   - `warnings件数`
   - 登録販売者不足警告の件数
   - 契約日数警告の件数
4. もし警告0件にならない場合は、solver修正ではなく「実店舗制約上、登録販売者カバレッジが満たせない」可能性として原因を分析する。
5. もし警告0件になる場合は、Dexが同じコマンドで再現できるよう、実行コマンドとpayloadを完了報告に残す。
6. 実装変更を行った場合は `v4.11 -> v4.12` に更新する。文書・検証payload追加のみなら `version: 変更なし。理由: 検証補足のみ` と明記する。

## 既存の既知課題

以下は今回の再差し戻し主因ではありませんが、次サイクル候補として維持します。

- localStorage初期データ問題
- シフトパターン管理一覧の自由時間シフト重複表示・スマホはみ出し
- 曜日ごとの目標人数が平均±1名に縛られる設計課題

## Kazumax確認レベル

確認不要。
今回もDex側で再現NGを確認済みのため、Kazumaxがツールを触る必要はありません。

