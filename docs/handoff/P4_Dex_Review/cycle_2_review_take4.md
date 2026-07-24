# Cycle 2 P4 Take4再レビュー — OK（P5は範囲確認待ち）

- レビュー担当: Dex (P4)
- 対象ブランチ: `air-cc-dev`
- レビュー対象HEAD: `68c7768`
- P1修正比較元: `4e9ac54`
- 判定日: 2026-07-24

## 判定

**OK（Cycle 2 Take4のP1解消）**

通常生成の開始時に既存表を消していた処理は除去された。通常INFEASIBLE、HTTPエラー、通信例外では既存の表・手編集セル・localStorageを保持し、通常成功または利用者が明示選択した警告付き仮シフトの成功時だけ表を置換する。

## P1受入確認

1. `generateShift` の開始時に `setGeneratedResult(null)` がない。
2. `INFEASIBLE` 分岐は違反情報を更新するだけで、既存表を変更しない。
3. HTTPエラーと通信例外も表を変更せず、エラー通知のみを行う。
4. `generatedResult` 依存のlocalStorage保存は失敗経路で起動しないため、保存済み表も保持される。
5. `SUCCESS`／`FEASIBLE_WITH_WARNINGS` の成功応答だけが新しい表へ置換する。警告付き仮シフトは利用者の明示操作でのみ要求される。

CCの報告には、window.fetchモックによるINFEASIBLE・HTTPエラー・通信例外・明示警告仮シフト、および通常成功の確認手順がある。恒久的な自動UIテストではないため、次サイクルの回帰テスト候補とするが、今回のP1受入条件は満たす。

## 追加確認

- `parseStrictNumber` により、特殊シフト時間の `8abc` のような値を拒否する。保存処理も同じ厳密変換を用いる。
- バックエンド、solver、API契約に差分はない。
- `git diff --check 4e9ac54..68c7768` は問題なし。
- `python backend/test_solver.py`、`python backend/test_cycle2_take2.py`、`node frontend/test_time_utils.mjs`、`npm --prefix frontend run build` はすべて成功。

## P2（次Cycle候補）

- 失敗経路4ケースを恒久的な自動UIテストへ移す。
- 診断モードの連休上限の違反表示、診断目的関数の優先順位、公休・希望休・有休の直接回帰テスト、`RequestOff.is_forced=False` と入力エラー応答は、前回からの既知残件として維持する。

## P5の停止条件

Cycle 2 Take4自体はOKだが、`air-cc-dev` にはCycle 2外の既存BACKLOGコミット（Rシフト、Campaign／Skill Rank）もmainから分岐後に含まれる。この範囲を今回一括でmainへ統合してよいか、Kazumaxの確認後にのみDex(P5)を実施する。

P5実施時は、mainを `git pull --ff-only` で最新化し、レビュー対象HEAD `68c7768` とmerge対象が一致すること、未追跡の共通マニュアル同期ファイルを誤ってstageしないことを再確認する。

## P4レビュー終了時の明記

- 判定: **OK（Cycle 2 Take4）**。P5は統合範囲のKazumax確認待ち。
- サブレビュー利用判断と理由: **利用**。自動生成の状態保持、UI、保存、回帰範囲を独立確認するため。
- Kazumax確認レベル: **軽い確認**。Cycle 2外の既存BACKLOGコミットを同時にmainへ入れるかだけ確認が必要。Take4のP1仕様には新たな確認不要。
