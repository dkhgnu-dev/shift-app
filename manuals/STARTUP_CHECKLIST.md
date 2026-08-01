# STARTUP CHECKLIST

このファイルは、AIが毎回最初に読む軽量チェックリストです。
詳しいルールは `manuals/AI_TEAM_WORKFLOW.md` と `manuals/WORKFLOW_RULES.md` にありますが、通常起動ではまずこのファイルとプロジェクト固有ファイルで現在地を確認します。

## 毎回読むもの

1. `AGENTS.md`
2. `docs/handoff/CURRENT_STATUS.md`
3. `manuals/STARTUP_CHECKLIST.md`
4. `docs/PROJECT_RULES.md`（存在する場合）
5. `docs/handoff/WORKFLOW_RULES.md`（存在する場合）
6. 今回指定されたhandoffファイル

## 作業前の読了報告ゲート

ファイルを読まずに作業を始める事故を防ぐため、コード・文書・レビュー本文を書き始める前に、チャットへ短く読了報告を出す。

```text
読了報告:
- 必読: AGENTS.md / CURRENT_STATUS.md / STARTUP_CHECKLIST.md
- 固有: docs/PROJECT_RULES.md / docs/handoff/WORKFLOW_RULES.md
- 今回: （指定handoffファイル）
- 詳細マニュアル追加読み: 使用/不使用
- 理由: ...
```

読了報告を出すまでは、実装計画・コード編集・レビュー結論を書き始めない。

## 詳細マニュアルを追加で読む条件

以下に当てはまる場合だけ、該当する詳細マニュアルを追加で読む。

- チーム運用、P1/P2/P3/P4、サブエージェント判断が曖昧: `manuals/AI_TEAM_WORKFLOW.md`
- 引き継ぎ文、CURRENT_STATUS更新、同期、出口ゲートが必要: `manuals/WORKFLOW_RULES.md`
- 共通ルール自体を変更する: `AGENTS.md` の共通マニュアル更新ルールと `manuals/WORKFLOW_RULES.md`

## 絶対に守ること

- `CURRENT_STATUS.md` の最新ブロックを優先する。古い履歴に引っ張られない。
- 他プロジェクトのサイクル番号、handoff履歴、URL、固有設定を引き継がない。
- 作業中の他AI/ユーザー差分を勝手に戻さない。
- 長文レビュー、指示書、報告書は `docs/handoff/` に保存する。
- 提案は `docs/proposals/` に保存する。
- 次担当への起動メッセージが必要な場合は、単独のコードブロックで出す。
- `CURRENT_STATUS.md` は100行以内を目安に保ち、古い履歴は `docs/handoff/STATUS_ARCHIVE.md` へ移す。

## 危険タスク

DB、保存処理、金額計算、Excel、帳票、削除、上書き、既存データ破壊の可能性がある作業は、プロジェクト固有ルールを必ず確認し、必要に応じて Air(P1) -> Dex(P2) -> CC(P3) -> Dex(P4) の完全プロセスを通す。

危険タスクでは、`manuals/AI_TEAM_WORKFLOW.md` と `manuals/WORKFLOW_RULES.md` も強制的に追加で読む。
