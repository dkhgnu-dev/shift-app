# 公開版白画面 — Dex緊急修正報告

対象: `frontend/src/App.jsx`
基準commit: `9951677`
修正日: 2026-07-24

## 根本原因

手動入力用グリッドを常時表示したことで、生成前は`cell`が`null`になる。一方、モバイルとPCのselect要素が`cell.shift`を直接参照していたため、初期描画で`TypeError: Cannot read properties of null (reading 'shift')`となりReactが白画面になった。

Airの`9951677`はmatrix参照の多くを保護していたが、次の2箇所が残っていた。

- モバイル表示のselect
- PC表示のselect

## 修正内容

- 両方のselectを`value={cell?.shift || ''}`へ変更。
- `computeEmployeeStats`を`generatedResult?.matrix?.[i]`で保護し、部分的・旧形式の状態にも耐えるようにした。
- 生成前に常時表示する「空欄自動作成」が無反応だったため、`fillBlanks`先頭の`if (!generatedResult) return`を削除。手動入力がない初期状態でも空のfixed assignmentsで生成を依頼でき、手動入力後は既存の保護セル処理をそのまま使う。
- 表示バージョンを`v4.17`から`v4.18`へ更新。

## 確認

- ローカルViteを初期状態で読み込み、白画面が解消してグリッド・空欄自動作成・最適化シフトを生成が表示されることを確認。
- ブラウザconsole error: なし。
- `npm --prefix frontend test`、`node frontend/test_time_utils.mjs`、`npm --prefix frontend run build`を実行して確認する。

## 公開確認

mainへのpush後、Vercelが新しいcommitをデプロイしたことを公開URLで確認する。古いassetが残る場合はVercelダッシュボードでmainの最新デプロイを確認し、端末側は強制再読み込みを行う。

## デクスクルー補助確認

- UI観点: `cell.shift`の修正漏れ2箇所を特定。
- 回帰観点: 初期状態の空欄自動作成も無反応だったため、今回の常時表示仕様と整合するよう修正。
