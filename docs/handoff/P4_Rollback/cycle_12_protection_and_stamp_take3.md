# Cycle 12 Take2 Dex(P4)再レビュー - Take3差し戻し

## 判定

**差し戻し（Take3）**

- レビュー対象: `cc-cycle12-main-integration` / `f0b5b2622c146313d18982067d8b4a632626c746`
- 確認時main: `58f385fda065c915955836cbcc04efa5c1086215` / v4.44
- mainへのmerge: 未実施。CCはmergeせず、P4 OK後にDex(P5)が最新mainを再確認してmerge・pushする。追加のKazumax許可確認は不要。

Take2で、request tokenの実挙動と全画面中のタップ操作は改善した。以下2点を修正・検証して再提出すること。

## Finding 1 [P2] Phase1 FEASIBLE専用分岐をテストできていない

対象: `backend/test_cycle12.py` の `test_phase2_failure_falls_back_to_phase1_snapshot_and_keeps_fixed_values`

現テストはPhase1の結果を`OPTIMAL`または`FEASIBLE`のどちらでも合格させる。Dex再実行では`phase1_status=OPTIMAL`となり、`backend/shift_solver.py`のPhase1 `FEASIBLE`専用目的関数分岐を通っていなかった。

またPhase2の`Solve()`を呼ばずに`UNKNOWN`だけ返しているため、solver内部にPhase1解が残る。Phase2失敗後に誤って`solver.Value()`を読み直す回帰が入っても、テストが合格する余地がある。

### 修正対象

- `backend/test_cycle12.py`
- 製品コードは、テスト容易性のために本当に必要な場合のみ最小変更する。

### 期待する状態遷移

1. Phase1は実際に解を得たうえで、テスト上の返却statusを決定的に`FEASIBLE`とする。
2. Phase1 snapshot取得後、Phase2は決定的に`UNKNOWN`とする。
3. Phase2失敗後に`solver.Value()`が呼ばれたらテストを失敗させる。
4. 応答は保存済みPhase1 snapshotだけから復元され、固定セルが不変となる。

### 受入確認

- `phase1_status == 'FEASIBLE'`
- `phase2_status == 'UNKNOWN'`
- Phase2失敗後の`solver.Value()`呼び出しが0件
- 固定セル`emp_0/day0`が指定値のまま
- テストを2回連続実行して同じ結果

## Finding 2 [P2] 全画面中に背面の不可視UIへTabフォーカスが移る

対象: `frontend/src/App.jsx` の全画面表示、スタンプトグル/パレット、Undo/Redo、警告パネル、氏名列トグル周辺。

`z-index`対応によりポインター操作は可能になった。しかし全画面カードの背面に隠れたUndo/Redo、氏名列トグル、警告パネル等がfocusableなままであり、Tabキーで見えない要素へフォーカスが移る可能性がある。

### 修正対象

- `frontend/src/App.jsx`
- `frontend/src/App.cycle12.test.jsx`
- 必要なら`frontend/src/index.css`

### 期待する状態遷移

- 全画面ON中、Tab移動の対象は画面上で見えて操作できる全画面用コントロール、スタンプUI、表セルだけに限定する。
- 全画面背面の不可視UIは`inert`、無効化、条件付き非描画、または同等の標準的な方法でフォーカス対象外にする。
- 全画面OFF後は通常UIのTab操作が元に戻る。
- main由来の全画面表示・休日一覧、Cycle 12のスタンプ・固定セル保護を失わない。

### 受入確認

- 全画面ON中、背面のUndo/Redo・氏名列トグル等がTab対象外
- 閉じる、スタンプ開始/終了、筆選択、セル操作は引き続き可能
- 全画面OFF後、通常UIのフォーカス可能性が復元
- 320 / 375 / 768pxで全画面＋スタンプ操作に回帰なし
- 自動テストでON/OFF両状態のfocusable要素を確認

## 触らない範囲

- CCはmainへmerge/pushしない。P4 OK後のmerge/pushはDex(P5)が担当する。
- 自動生成制約、保存形式、API、休日一覧の計算内容を変更しない。
- request tokenテストはTake2で解消済みのため作り直さない。
- `docs/FRIEND_TEXTBOOK.md`は本Takeの対象外。

## 検証

- Cycle 12対象フロントテスト
- `python -u backend/test_cycle12.py`を2回連続
- フロント全体テスト
- production build
- version gate
- `git diff --check`
- conflict marker、変更ファイル、main未統合の確認

## デクスクルー統合結果

- 使用理由: Take2の見落とし防止と、ソルバー・全画面UIを独立観点で監査するため。
- デクスクルーAの「FEASIBLE分岐未到達」は採用。
- デクスクルーBの「不可視背面UIへのフォーカス」は採用。
- HEAD表記は、報告書commit自身のhashを同じcommit内へ自己記載できないため、差し戻し理由としては不採用。レビュー対象はKazumax指定とGit実測の`f0b5b26`で確定した。
- 物理スマホのsafe-areaは残余リスクとして保留し、今回の必須差し戻しには含めない。
