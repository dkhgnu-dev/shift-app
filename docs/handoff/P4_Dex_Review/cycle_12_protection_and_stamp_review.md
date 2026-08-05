# Cycle 12 Dex(P4) DIFFレビュー

## 判定

**差し戻し（Cycle 12単体の主要実装は適合。ただし最新mainとの統合前に修正・追加検証が必要）**

- レビュー対象: `cc-cycle12-stamp-and-protect` / `ee766eaf5d8cb862babb3ddd78297d6c62879860`
- 実装基点: `cfcd3a561a23bac2befa45c6b49dbc100f4fbbd1`
- 確認時main: `58f385fda065c915955836cbcc04efa5c1086215` / v4.44
- mainへのmerge: 未実施。Kazumaxの明示判断待ち。

## Findings

### P1: 全画面表示とスタンプUIが機能衝突する

最新mainの全画面表示は `.matrix-glass-card` を `position: fixed; z-index: 9999` で画面全体へ展開する。一方、Cycle 12のスタンプ開始ボタンと筆パレットは同カードの外側にある。

このため両差分をそのまま統合すると、スマホで全画面表示中にスタンプ開始・筆変更UIがカードの背後へ隠れ、操作できない。Gitの3-way mergeではこの機能衝突を自動検出できない。

対象:

- `frontend/src/App.jsx` のmain側 `isFullScreen` / 全画面用style
- `frontend/src/App.jsx` のCycle 12側 `stampModeEnabled` / `stamp-palette`

必要対応:

1. 最新mainを取り込むタイミングはKazumaxの承認後とする。
2. 全画面表示中もスタンプ開始、筆選択、連続スタンプ、終了が操作できるUIへ統合する。
3. 320 / 375 / 768pxで全画面ON/OFFとスタンプ操作を実機確認する。
4. main側の全画面表示、休日一覧表示とCycle 12側の固定セル保護・スタンプを両方保持する。

### P2: Phase 2失敗フォールバックの専用回帰テストが未実施

P2指示書6.2の必須項目「Phase1 FEASIBLE・Phase2失敗時のフォールバックでも固定値が不変」に対し、P3報告は専用テスト未追加としている。実装コード上はPhase1 snapshotを保持しているが、固定値保持を将来も保証する自動テストが不足している。

必要対応:

- Phase 2が解を返さない条件をテスト用に決定的に作り、Phase 1 snapshotへ戻った結果でも固定セルが不変であることを確認する。
- ソルバー内部への過度な結合を避ける必要がある場合は、solver/factoryまたは小さい純粋な選択関数へ分離して検証する。

### P2: request tokenテストが実挙動を検証していない

`frontend/src/App.cycle12.test.jsx` の古い応答テストは、ガード実装のソース文字列確認が中心であり、古い応答を後から解決したときにmatrix・employees・履歴・生成状態が更新されないことを実行検証していない。実装自体のtoken比較は妥当だが、回帰防止として弱い。

必要対応:

- `generateShift` と `fillBlanks` をまたぐ2要求のPromise解決順を逆転させ、古い応答がstateへ反映されないことをDOMまたはstate観測で検証する。

## 確認できたこと

- 手動・由来不明セルだけを通常生成で保護し、`isFixed:false`を再最適化へ回す抽出はP2と一致。
- 不正固定割当はモデル構築前に`ValueError`となり、APIでHTTP 400へ変換される。
- 保護セルの元オブジェクト再合成、希望休同期、スタンプのno-op・履歴化・許可シフト判定はコード上P2と一致。
- day max持ち越し、`jpholiday`、特殊シフトのEARLY/LATE除外は対象テストで確認。
- 対象フロントテスト 33/33 PASS。
- `backend/test_cycle12.py` 12/12 PASS。
- production build PASS。
- version gate PASS（branch内 v4.45）。
- `git diff --check` PASS。
- main側は実測上 `App.jsx` と `CURRENT_STATUS.md` が同時変更で、`index.css` はmain側変更なし。文字競合は主にversion行とCURRENT_STATUSだが、上記の機能衝突が別途ある。

## デクスクルー

- 使用理由: 自動生成・固定セル・タッチUIと、進行したmainの統合リスクが同時に存在するため。
- クルーA: Cycle 12の安全ロジックと必須テストを監査。
- クルーB: 最新mainとの競合・機能取りこぼしを監査。
- 最終判定はDexが実差分、テスト、3-way仮想merge結果を再確認して統合した。

## merge停止条件

Kazumaxから明示承認があるまで、最新mainの作業branchへの取り込み、および作業branchのmainへのmergeを行わない。友達側のmain更新が止まった時点で再fetchし、HEAD/versionを再確定する。
