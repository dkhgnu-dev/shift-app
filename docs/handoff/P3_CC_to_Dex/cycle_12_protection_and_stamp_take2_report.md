# P3報告書: Cycle 12 Take2「Dex(P4)差戻し対応(main統合)」

## 対応した指示書・レビュー
- `docs/handoff/P4_Dex_Review/cycle_12_protection_and_stamp_review.md`(P4差戻し)
- Kazumaxからの起動指示(「友達側がmainを作業している可能性があるため、勝手にmainへmerge・pushしないこと。最新mainの取り込みが必要になった時点で、最初にKazumaxへ許可を求めること」)

## Kazumax確認の経緯

指示文の末尾が「Kazumaxの許可後、最新mainを取得して統合専用branchまたは」で途切れていたため、作業前にAskUserQuestionで確認した。

- **確認内容**: P1(全画面表示とスタンプUIの統合)をどちらの方式で進めるか。
- **回答**: 「新しい統合専用branchを作り、main+cc-cycle12をそこで合流」を選択。
- 以降、この方針で作業した。`main`・`cc-cycle12-stamp-and-protect`のどちらにも直接pushやmergeは行わず、新設した`cc-cycle12-main-integration`branchでのみ統合作業を実施した。

## Take2差戻し内容と対応

### P2(先行対応・mainに触れない範囲): Phase2失敗フォールバックの専用回帰テスト
`cc-cycle12-stamp-and-protect`ブランチ上で先に対応し、commit `6073dda`としてpush済み。

- `backend/test_cycle12.py`に`test_phase2_failure_falls_back_to_phase1_snapshot_and_keeps_fixed_values`を追加。
- `ortools.sat.python.cp_model.CpSolver.Solve`をモンキーパッチし、1回目(Phase1)は本物のSolveを実行、2回目(Phase2)だけ強制的に`UNKNOWN`を返す構成で、Phase2失敗時にPhase1スナップショットへフォールバックし、固定セル(fixed_assignments)が不変であることを直接検証する。

### P2(先行対応): request tokenの実挙動テスト
同じく`cc-cycle12-stamp-and-protect`上で対応(commit `6073dda`)。

- 従来のソース文字列確認テストを廃止し、`frontend/src/App.cycle12.test.jsx`に実挙動テストを追加。
- 通常UIでは`disabled={isGenerating}`によりネイティブbuttonへのclick自体がjsdom上も発火しないため(検証済み)、Reactの内部イベントハンドラ(`element[reactPropsKey].onClick`)を`act()`でラップして直接呼び出す手法で、`disabled`ガードを迂回しつつ本番のonClickハンドラ自体は一切変更せずに2要求(generateShift→fillBlanks)を強制的に開始させた。
- 後発の要求(B)を先に解決、先発の要求(A)を後から解決させ、古い応答(A)がstate(matrix/localStorage)を上書きしないことをDOM/localStorage観測で直接証明した。

### P1(本Take2の主対応): 全画面表示とスタンプUIの機能衝突

**作業branch**: `cc-cycle12-main-integration`(`origin/main`のv4.44を起点に新設し、`cc-cycle12-stamp-and-protect`をmerge)

1. `origin/main`(v4.44時点)を起点に統合専用branchを新設。
2. `cc-cycle12-stamp-and-protect`(P2対応済みcommit `6073dda`まで)をmerge。
   - 文字競合: `frontend/src/App.jsx`のversion表示2箇所、`docs/handoff/CURRENT_STATUS.md`のみ(Dex実測通り、`index.css`・バックエンド一式は競合なし)。
   - versionはmain側v4.44・cc-cycle12側v4.45のどちらよりも新しい**v4.46**へ採番して解消。
3. 機能衝突の解消: mainの全画面表示は`.matrix-glass-card`を`position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999`で画面全体に展開する。スタンプ開始ボタン・筆パレットはこのカードの外側の通常配置のままだったため、全画面表示中はカードの背後に隠れて操作できなくなっていた。
   - mainの「閉じる」ボタン自身が使っていたのと同じ手法(`position:fixed` + より高い`zIndex:10000`)を、スタンプトグルボタンとパレットにも`isFullScreen`時だけ適用。
   - スタンプトグル: `bottom:16px; left:16px; zIndex:10000`(閉じるボタンは`top:16px; right:16px`のため重ならない)。
   - パレット: `bottom:70px; left:16px; right:16px; zIndex:10000; maxHeight:40vh; overflowY:auto`。
   - `isFullScreen`が`false`のとき(通常配置)はこれらのスタイルを付与しない(既存の見た目・挙動を変えない)。

## 変更ファイル(本Take2分)
- `frontend/src/App.jsx`(全画面表示×スタンプUIの共存対応、version 2箇所をv4.46へ)
- `frontend/src/App.cycle12.test.jsx`(全画面表示×スタンプの回帰テスト2件を追加)
- `docs/handoff/CURRENT_STATUS.md`(統合branchの状況を反映)
- (P2分、`cc-cycle12-stamp-and-protect`上で先行commit): `backend/test_cycle12.py`、`frontend/src/App.cycle12.test.jsx`

## 恒久テスト(新規)
- `App.cycle12.test.jsx`「全画面表示ON時、スタンプトグルとパレットがposition:fixed・z-index:10000になる」: 全画面ON→スタンプON→筆選択→セルへの実スタンプまで一連の操作が通ることを確認。
- `App.cycle12.test.jsx`「全画面表示OFF時は、スタンプトグルとパレットに固定配置スタイルが付かない」: 通常時に余計な固定配置が付かないことを確認。
- **既知の環境固有事象**: 最初の実装時、1件目のテストが全画面表示ONのまま終了すると、jsdomが`<style>`タグ除去後もCSSOMルール(`.month-header{display:none!important}`等)を保持し続け、後続の別テストで無関係な「最適化シフトを生成」ボタンが見つからなくなる汚染が発生することを発見した。テスト末尾で明示的に全画面表示をOFFへ戻すことで解消し、原因をコード内コメントに記録した(本番の挙動には影響しない、テスト環境固有の後始末)。

## 検証結果

### フロントエンド
- `npx vitest run`(全体): **2回連続222/222 PASS**(256.76秒 / 345.32秒)、タイムアウト0件。
- `node frontend/test_time_utils.mjs`: 33/33 PASS
- `npm run build`: PASS

### バックエンド
- `python -u backend/test_solver.py`: SUCCESS
- `python -u backend/test_cycle12.py`: PASS(Phase2フォールバックテスト含む)
- `python -u backend/test_cycle2_take2.py`: PASS(実測4分36秒。前回同様300秒超だが2回連続の完走を確認)

### Git / バージョン
- `node scripts/check_version_gate.mjs cfcd3a561a23bac2befa45c6b49dbc100f4fbbd1`: `PASS: App and CURRENT_STATUS are v4.46.`
- `git diff --cached --check`: PASS(CRLF警告のみ)
- `git status --short`: 意図した変更のみ。AGENTS.md/.cursorrules/CLAUDE.md/docs/manual_legacy/はステージ対象外。

### ブラウザ実機確認(320 / 375 / 768px)
localhost devサーバーで2名fixtureを投入し確認。

- **375px**: 全画面表示ON → スタンプトグルが`position:fixed; z-index:10000`で最前面に浮き、`document.elementFromPoint()`でも実際にクリック可能な要素であることを確認。スタンプON → パレット表示(`position:fixed; z-index:10000`) → 筆(④)選択 → セルへ実際にスタンプ成功(`{shift:'④', isFixed:true, isError:false}`)。スタンプOFF → パレット消滅。全画面解除 → `.month-header`等が再表示。
- **320px**: 全画面+スタンプパレット表示時もパレットがビューポート内に収まり、横スクロール(`scrollWidth > innerWidth`)が発生しないことを確認。
- **768px**: スタンプトグル・パレット各候補ボタンとも実測44px以上のタップ領域を確認。
- 全幅共通: Browser console warning/error 0件。

## 触らなかった範囲(指示通り)
- `main`ブランチそのもの(pushもmergeも実施していない)
- `cc-cycle12-stamp-and-protect`ブランチそのもの(統合はすべて新設の`cc-cycle12-main-integration`上で実施)
- main側の全画面表示・従業員休日一覧表示のロジック自体(UIの重なり解消のみ対応し、機能の中身は変更していない)
- バックエンドAPI、DB、永続化形式

## 未実施確認
- 実物理タッチデバイスでの全画面+スタンプ同時操作の操作感(Browser実機はデスクトップブラウザのビューポート変更+pointer eventディスパッチによる確認)。
- `docs/FRIEND_TEXTBOOK.md`に無関係な古いGit競合マーカー(`<<<<<<< HEAD` 等、コミット`0dfdfc2`/`7b88720`由来)が残存していることを発見したが、本Cycleの変更対象外のため一切触れていない(別途Air/Kazumaxへの報告事項として認識のみ)。

## 残余リスク
- mainは本Take2作業中も更新され得る状態が続いている可能性がある。統合branchをpushした時点のmainのHEADは`58f385f`(v4.44)。merge直前に再度mainの最新HEAD/versionを確認することを推奨する。
- `docs/FRIEND_TEXTBOOK.md`の古いGit競合マーカー(上記「未実施確認」参照)は、本Cycleとは無関係だが、別途クリーンアップが必要な可能性がある。

## `main`について
`main`へは一切pushもmergeもしていません。作業はすべて新設の`cc-cycle12-main-integration`ブランチ上。`cc-cycle12-stamp-and-protect`ブランチも変更していません(P2対応はそちらで先行commit・push済みですが、その後は触れていません)。

## 実装コミットとHEAD
- 統合branch: `cc-cycle12-main-integration`
- 起点: `origin/main` @ `58f385fda065c915955836cbcc04efa5c1086215`(v4.44)
- merge元: `cc-cycle12-stamp-and-protect` @ `6073dda`(P2対応済み)
- 統合コミット: `0acb0c4`
- 最終HEAD: `5049e81`(`origin/cc-cycle12-main-integration`へpush済み)
