# AGU START HERE - 友達シフト

このファイルは、アグ（Antigravity）が毎回最初に読む短い入口です。

## 0. 作業フォルダの確認

- Repository: `dkhgnu-dev/shift-app`
- 正規の作業フォルダで `git remote -v` を確認する。
- 他プロジェクトのサイクル、バージョン、指示書を混ぜない。

## 1. 最初の強制手順

1. 作業中の未コミット変更の有無を `git status --short --branch` で確認する。
2. 未コミット変更がなければ `git pull --ff-only` で最新版を取得する。
3. 変更がある、またはpullでconflict/errorが出た場合は、勝手に解決せず停止して報告する。
4. 以下を読む。
   - `AGENTS.md`
   - `docs/AGU_START_HERE.md`
   - `docs/handoff/CURRENT_STATUS.md`
   - `manuals/STARTUP_CHECKLIST.md`
   - `docs/PROJECT_RULES.md`
   - `docs/handoff/WORKFLOW_RULES.md`
   - 今回指定された指示書
5. コードを書く前に読了報告を出す。

```text
読了報告:
- Repository: dkhgnu-dev/shift-app
- 現在のbranch / HEAD: ...
- 現在の画面version: ...
- 読んだファイル: ...
- 今回の変更が製品コードか: はい/いいえ
- version更新予定: vX.Y -> vX.Z / 更新なし（理由）
- 危険領域・Dexレビュー: 必要/不要（理由）
```

この読了報告を出す前に、実装、commit、push、「完了しました」という報告をしてはいけません。

## 2. versionの絶対ルール

- 現在の正しいversionは、pull後の `frontend/src/App.jsx` に表示される値から読み取る。記憶や過去の報告書から推測しない。
- 製品コードを変更した場合は、表示versionを最新値から1つ進める。
- `frontend/src/App.jsx` のスマホ表示とPC表示の2か所を必ず同じversionにする。
- `docs/handoff/CURRENT_STATUS.md` の `Version` も同じ値にする。
- `frontend/package.json` の `0.0.0` は画面versionではないため、代わりに書き換えない。
- 文書、テスト、レビュー報告だけの変更はversionを上げない。完了報告に理由を書く。
- 実装していない未来のversionを「次はこれでpushします」と先に完了扱いしない。
- branch作業中にmainが更新された場合は、merge直前にmainの最新versionを再確認する。versionが重複する場合は勝手にmergeしない。

## 3. 完了の強制ゲート

commit前に以下を実行する。

```text
node scripts/check_version_gate.mjs
git diff --check
git status --short
```

完了報告に必ず次を書く。

- 変更前version
- 変更後version、または更新しない理由
- 表示2か所と`CURRENT_STATUS.md`が一致したこと
- 実行したテストと結果
- commit hash / push先branch
- Dexレビューが必要か

強制ゲートが1つでも失敗した場合は、完了と報告せず失敗内容を報告する。
