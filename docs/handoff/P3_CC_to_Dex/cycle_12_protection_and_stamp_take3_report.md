# P3報告書: Cycle 12 Take3「Dex(P4)差戻し対応」

## 対応した指示書
- `docs/handoff/P4_Rollback/cycle_12_protection_and_stamp_take3.md`(Take3差戻し)

## 作業branch
`cc-cycle12-main-integration`(Take2から継続。新branchは作成していない)

## Take3差戻し内容と対応

### Finding 1 [P2]: Phase1 FEASIBLE専用分岐をテストできていない

対象: `backend/test_cycle12.py` の `test_phase2_failure_falls_back_to_phase1_snapshot_and_keeps_fixed_values`

**問題**: 旧テストはPhase1の実Solve結果をそのまま`phase1_status`として使っていたため、Dex再実行時に`OPTIMAL`となり、`backend/shift_solver.py`のPhase1「FEASIBLE(未証明)専用」目的関数分岐(`else:`側、スラックをハード固定せず巨大重みで目的関数に残す側)を一度も通っていなかった。またPhase2失敗後に`solver.Value()`が誤って再度呼ばれる回帰が入っても検知できなかった。

**修正**:
1. `CpSolver.Solve`をモンキーパッチし、1回目の呼び出し(Phase1)は本物のSolve()を実行して実際に解を得たうえで、`_solve_once()`への返却値だけを決定的に`cp_model.FEASIBLE`へ強制する(実際の変数値は本物のSolveで得たものをそのまま使うため、値自体の正当性は損なわない)。これにより`phase1_status == cp_model.OPTIMAL`分岐ではなく`else`(FEASIBLE専用)分岐が必ず実行される。
2. 2回目の呼び出し(Phase2)は決定的に`cp_model.UNKNOWN`を返し、Phase2失敗を模擬する。
3. `CpSolver.Value`もモンキーパッチしてグローバルな呼び出し回数を計測し、Phase2失敗(2回目のSolve呼び出し)が発生した瞬間の呼び出し回数を記録。テスト末尾で「Phase2失敗以降、Value()の呼び出し回数が増えていない」ことを直接検証する(Phase2失敗後に誤って`solver.Value()`を読み直す回帰が入れば、このテストで確実に失敗する)。
4. `phase1_status == 'FEASIBLE'`、`phase2_status == 'UNKNOWN'`、固定セル(`emp_0`/`day0`)が不変であることをそれぞれ個別に検証。

**受入確認結果**:
- `phase1_status == 'FEASIBLE'`: 確認済み
- `phase2_status == 'UNKNOWN'`: 確認済み
- Phase2失敗後の`solver.Value()`呼び出し0件: 確認済み
- 固定セル`emp_0/day0`が指定値のまま: 確認済み
- `python -u backend/test_cycle12.py`を2回連続実行して同じ結果: 確認済み(後述の検証結果を参照)

### Finding 2 [P2]: 全画面中に背面の不可視UIへTabフォーカスが移る

対象: `frontend/src/App.jsx`

**問題**: 全画面表示中は`.mobile-header, .sidebar, .sidebar-overlay, .month-header, .zoom-controls`のみ`display:none !important`で非表示にしており、それ以外の要素(Undo/Redo、氏名列トグル、警告パネル、交換確認パネル)は`.matrix-glass-card`(`position:fixed; z-index:9999`)の背面に視覚的に埋もれるだけで、DOM上はfocusableなまま残っていた。

**修正**: 該当要素へ`inert={isFullScreen ? 'true' : undefined}`を付与した。
- React 18.3.1は`inert`をブール値propとして認識しない(`inert={true}`は警告が出てDOM属性が付与されない)ため、文字列`'true'`を渡してDOM属性`inert="true"`として確実にレンダリングされることを確認したうえで採用した(HTML仕様上、`inert`属性は値に関わらず存在すればtrue)。
- 対象: Undo(`元に戻す`)ボタン、Redo(`やり直す`)ボタン、交換確認パネル(`swapPending`)、`infeasible-panel`(自動生成停止時・警告付き仮シフト表示時)、`warning-panel`(診断アドバイス表示時)、氏名列トグル(`.name-col-toggle-btn`)。
- 全画面表示の閉じるボタン自身・スタンプ開始ボタン・スタンプパレットは対象外とした(既にposition:fixed + z-index:10000で最前面に浮いており、全画面中も操作対象であるべきため)。
- 全画面表示OFF時は`inert`属性を一切付与しないため、通常のフォーカス・操作性は変化しない。

**確認したが対象外だったもの**: `.zoom-controls`(➖/➕/画面にフィット)は既存の`display:none !important`で既にTab対象外になっているため追加対応不要。`infeasibleInfo`/`generatedResult`パネル内の個別ボタン(閉じる、違反一覧を確認のうえ...)はパネルのdiv自体に`inert`を付与しているため、子要素として連動してフォーカス対象外になる。

**受入確認結果**:
- 全画面ON中、Undo/Redo・氏名列トグル・警告パネル(交換確認パネル/`infeasible-panel`/`warning-panel`)が`inert`属性を持つことを確認(自動テスト)
- 閉じる、スタンプ開始/終了、筆選択、セル操作は引き続き可能(既存Take2テストで確認済み・回帰なし)
- 全画面OFF後、`inert`属性が外れ通常のフォーカス可能性が復元されることを確認(自動テスト)
- 320 / 375 / 768pxでの実機回帰は、既存Take2の全画面+スタンプ操作テスト(Browser実機確認)と本Take3のjsdom自動テストの組み合わせで担保。表示レイアウト自体は変更していないため、Take2で確認済みの320/375/768px結果に変化はない。

**既知の残余ギャップ**: jsdom(vitest環境)は`inert`属性が実際にTabキーのフォーカス移動を阻止する挙動(ブラウザネイティブの仕様)までは再現しないため、自動テストでは「`inert`属性の有無」のみを検証している。この点はCCクルーにも確認を依頼し、Chrome 102+/Firefox 112+/Safari 15.5+の主要evergreenブラウザが`inert`をネイティブ実装済みであることから、レガシーブラウザ対応が要件にない本アプリでは許容可能なギャップと判断した(詳細は下記CCクルー結果を参照)。

## 変更ファイル
- `backend/test_cycle12.py`(Phase1 FEASIBLE専用分岐テストの修正)
- `frontend/src/App.jsx`(全画面中の背面不可視UIへの`inert`付与、version 2箇所をv4.47へ)
- `frontend/src/App.cycle12.test.jsx`(Take3回帰テスト2件を追加: `inert`のON/OFF切替、`infeasible-panel`の`inert`切替)
- `docs/handoff/CURRENT_STATUS.md`(Take3対応完了の状況を反映)

## CCクルー結果(独立検証)

Dex指示の通り、2観点で並列にCCクルー(Agent)を実行した。

**クルーA(ソルバーPhase1/Phase2テスト経路)**: `backend/shift_solver.py`の`_solve_once`実装(495〜566行)とテストの対応関係をトレースし、`python -u backend/test_cycle12.py`を2回連続実行。
- 結論: **ACCEPT**。強制した`phase1_status`(`FEASIBLE`)が`_solve_once`のローカル変数へそのまま流れ込み`else`(FEASIBLE専用)分岐を実行すること、`diagnostic_mode=False`のため他に`solver.Value()`呼び出し経路が存在しないこと(=Value()呼び出し追跡にループホールがないこと)を確認。2回連続実行とも全項目`[OK]`、`ALL CYCLE12 REGRESSION TESTS PASSED`。

**クルーB(全画面アクセシビリティ/フォーカス修正)**: `frontend/src/App.jsx`内の全`inert`付与箇所と、全画面表示中に埋もれる他のfocusable要素の有無を確認し、`npx vitest run src/App.cycle12.test.jsx`を実行。
- 結論: **ACCEPT**。全`inert`付与箇所が正しい要素に付いており、閉じるボタン・スタンプUIには付いていないこと、`.zoom-controls`以外に見落としたfocusable要素がないこと、新規Take3テストがON/OFF双方向で実際に値が反転する非自明なテストであることを確認。jsdomの`inert`挙動未実装という残余ギャップも、evergreenブラウザ前提であれば許容可能と判断。

## 検証結果

### フロントエンド
- `npx vitest run src/App.cycle12.test.jsx`: 20/20 PASS(Take3新規2件含む)
- `npx vitest run`(全体): **224/224 PASS**(305.64秒)
- `npm run build`: PASS

### バックエンド
- `python -u backend/test_solver.py`: SUCCESS
- `python -u backend/test_cycle12.py`: **2回連続PASS**(Phase1 FEASIBLE専用分岐テスト含む)
- `python -u backend/test_cycle2_take2.py`: PASS(fail-closed網羅ケース含む)

### Git / バージョン
- `node scripts/check_version_gate.mjs 9e11014`(Take3着手時点のHEAD): `PASS: App and CURRENT_STATUS are v4.47.`
- `git diff --check`: 変更ファイル(App.jsx / App.cycle12.test.jsx / test_cycle12.py / CURRENT_STATUS.md)すべてクリーン
- `git status --short`: 意図した変更のみ(`AGENTS.md`/`.cursorrules`/`CLAUDE.md`/`docs/manual_legacy/`はステージ対象外)
- Take3着手時点でorigin/mainを再fetchし、App.jsxがv4.44のままであることを確認(採番衝突なし)

## 触らなかった範囲(指示通り)
- `main`ブランチそのもの(pushもmergeも実施していない)
- 自動生成制約、保存形式、API、休日一覧の計算内容
- request tokenテスト(Take2で解消済みのため作り直していない)
- `docs/FRIEND_TEXTBOOK.md`

## `main`について
`main`へは一切pushもmergeもしていません。統合branch`cc-cycle12-main-integration`上でのみ作業しました。DexがP4 OKを出した後も、Kazumaxの明示承認なしにmainへmergeしません。
