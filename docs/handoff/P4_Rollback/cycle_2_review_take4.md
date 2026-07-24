# Cycle 2 P4 Take3再レビュー — Take4差し戻し

- レビュー担当: Dex (P4)
- 対象ブランチ: `air-cc-dev`
- レビュー対象HEAD: `4e9ac54`
- 比較元: `2c49529`（Take2）
- 判定日: 2026-07-24

## 判定

**NG（Take4差し戻し）**

バックエンドの通常INFEASIBLE停止、明示操作による警告付き仮シフト、休み区分の扱いは前進している。しかし通常生成でAPI応答前に既存の生成表を消すP1が残る。このままでは「条件を満たせない場合は出力せず、現在の表を保つ」というKazumax決定に反するため、P5のmain統合は行わない。

## 必須修正（P1）

### P1: 通常生成のINFEASIBLE／通信失敗で既存表が消える

`frontend/src/App.jsx` の `generateShift(false)` はAPI呼び出し前に `setGeneratedResult(null)` を実行する。通常生成が `INFEASIBLE` を返すと、INFEASIBLE分岐では既存結果を復元しない。保存処理も連動するため、画面上の既存表（手編集を含む）が消える。

要求:

1. 通常生成のリクエスト開始時に既存 `generatedResult` を消去しない。
2. 正常OPTIMAL結果、または利用者が明示的に選んだ警告付き仮シフト結果だけが表を置換する。
3. 通常INFEASIBLE・API失敗・通信失敗では既存表とlocalStorageの保存内容を保持する。
4. 上記を確認できるUIテスト、または同等に再実行可能な検証手順を追加する。

### 実装ガイド（CC向け）

- 変更の主対象は `frontend/src/App.jsx` の `generateShift`。通常生成開始時の `setGeneratedResult(null)` を除去し、結果を受け取ってから置換する。
- `status === 'OPTIMAL'` では新しい結果で置換してよい。`allow_warning_draft=true` の明示操作で返る警告付き仮シフトも、その操作の結果として置換してよい。
- 通常生成で `status === 'INFEASIBLE'`、HTTPエラー、ネットワーク例外のいずれでも、既存の `generatedResult` を変更しない。エラーバナー／違反一覧だけを更新する。
- 保存処理が `generatedResult` の変更を起点にしている場合、失敗経路で `null` が保存されないことを確認する。

### 受入確認（必須）

既存の生成済み表がある状態で、次の4ケースを確認する。各ケースで、表示表・手編集済みセル・localStorageの表データが保持されることを確認する。

1. 通常生成が `INFEASIBLE` を返す。
2. 通常生成のAPIがHTTPエラーを返す。
3. 通常生成でネットワーク例外が起きる。
4. 警告付き仮シフトを利用者が明示選択した場合だけ、新しい仮シフト表へ置換される。

成功する通常生成では、従来どおり新しい最適表へ置換されることも確認する。

## P2（Take4で併せて整理・対応推奨）

1. 診断モードでは連休上限（正社員3日、パート5日）の制約を緩和・違反記録していない。そのため連休上限だけが原因でも診断結果や警告付き仮シフトを出せない。全違反理由を示すという目的に合わせる。
2. 診断モードの目的関数は重み付き和であり、違反数を最小化する保証がない。段階ソルブまたは十分性を証明できる重みとテストで、診断違反を優先する。
3. 休み区分の回帰テストを拡充する。公休・希望休が勤務日数・勤務時間・人員・RS・鍵・実連勤に入らず、真の休みとして7日ルールに入ること、有休は勤務日数・時間だけを満たし人員等には入らないことを、それぞれ直接検証する。
4. `RequestOff.is_forced=False` の意味を仕様どおりに実装・テストするか、不要なら入力仕様から除く。無効な従業員ID／期間外日付は500ではなく入力エラー（400/422）にする。
5. 特殊シフト時間の数値入力は `parseFloat` ではなく厳密な数値変換を用い、`8abc` のような値を拒否する。

## 確認済み

- 通常INFEASIBLEは `status=INFEASIBLE`・空シフトとなり、警告付き仮シフトは利用者の明示操作時のみ取得する実装を確認。
- 公休・希望休・有休の主要な計算修正とTake3回帰テストを確認。
- `python backend/test_solver.py`、`python backend/test_cycle2_take2.py`、`node frontend/test_time_utils.mjs`、`npm --prefix frontend run build` はすべて成功。
- `git diff --check 2c49529..4e9ac54` は問題なし。

## P5

P1未解消のため、Dex(P5)によるmain統合・pushは**実施しない**。

## 次担当への依頼

CC(P3)がP1を修正し、再現可能な検証を添えて `air-cc-dev` へpush後、Dex(P4)へTake4再レビューを依頼する。

```text
【CC→Dex】

Cycle 2 Take4の修正が完了し、air-cc-devへpush済みです。

■ 再レビュー依頼: docs/handoff/P4_CC_to_Dex/cycle_2_review_take4_request.md
■ 対応報告: docs/handoff/P3_CC_to_Air/cycle_2_implementation_report_take4.md

P1「通常生成がINFEASIBLE／通信失敗のとき既存表を消す」を修正しました。
通常失敗時の表・localStorage保持を確認するテストまたは再現手順も添付しています。
```

## P4レビュー終了時の明記

- 判定: **NG（Take4差し戻し）**
- サブレビュー利用判断と理由: **利用**。制約実装、UI状態、回帰・範囲を独立確認する高リスク変更のため。
- Kazumax確認レベル: **確認不要**。既に合意済みの「通常INFEASIBLE時は既存表を保持」を実装どおりに直す差し戻しであり、新たな仕様判断は不要。
