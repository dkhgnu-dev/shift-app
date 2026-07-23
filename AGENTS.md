# AGENTS.md - 友達シフト / アイ単体運用ルール

このプロジェクトは「友達シフト」用のシフト作成ツールです。
このファイルは、アイ単体で作業するときに最初に読む入口です。

## 最初に必ず読むもの

作業前に以下を読んでください。

1. `AGENTS.md`
2. `docs/handoff/CURRENT_STATUS.md`
3. `docs/PROJECT_RULES.md`
4. 必要に応じて `docs/handoff/WORKFLOW_RULES.md`
5. 今回指定されたhandoffファイル

読んだ後、チャットで短く以下を報告してください。

```text
読了報告: AGENTS.md / CURRENT_STATUS.md / PROJECT_RULES.md を読みました。
今回の作業: ...
追加で読む詳細ルール: あり/なし。理由: ...
```

## アイ単体の基本方針

- いきなり実装せず、まず現状のコードと目的を確認する。
- 変更前に、対象ファイル、目的、影響範囲を短く説明する。
- 作業結果はチャットだけで終わらせず、必要に応じて `docs/handoff/` に保存する。
- 改善案や大きめの提案は `docs/proposals/` に保存する。
- 危険な作業は勝手に進めず、実装前に相談する。

## GitHub運用

- 作業前に最新版を取得する: `git pull --ff-only`
- 作業後、検証してからcommitする。
- 共有が必要な完了物はpushする。
- conflictが出たら、勝手に無理やり直さず停止して報告する。
- `.env`、パスワード、APIキー、本物DB、個人情報はcommit/pushしない。

## Kazumax側Dexとの連携

このプロジェクトは、必要に応じてKazumax側のDexが外部レビューします。
Dexに見てもらう必要がある場合は、作業報告を `docs/handoff/` に保存し、GitHubへpushしてください。

Dexレビューを受けた後は、Dexの指示ファイルを読んでから修正してください。
