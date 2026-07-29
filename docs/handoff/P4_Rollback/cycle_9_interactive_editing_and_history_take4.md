# Cycle 9 Take3 Dex(P4)レビュー - Take4差し戻し

## 判定

**P4 NG / CC(P3)へTake4差し戻し**

- branch: `cc-cycle9`
- review HEAD: `eaaa472`
- implementation commit: `b6c235f`
- Version: `v4.33`
- `main`へmergeしないこと

実装ロジックはTake3の必須修正を満たしています。P1 Findingはありません。
ただし、Take3差し戻しで必須とした安全停止の恒久テストが片側のみで、履歴・生成結果の不変も十分に検証されていないため、テスト追加だけをTake4として差し戻します。

## Finding

### P2: 通常シフト0件時の安全停止テストが片側のみ

対象:

- `frontend/src/App.cycle9.test.jsx:674`

現テストは「最適化シフトを生成」だけを押し、次を確認しています。

- fetchされない
- alertが表示される
- 実行中表示が出ない
- matrixが変わらない

一方、同じ安全停止が必要な「空欄自動作成」は未検証です。また、テスト名にある「履歴を変更しない」と、差し戻し条件にある「生成結果を変更しない」を直接確認していません。

`fillBlanks()`の現実装もfetch・状態変更より前に停止しており、静的には正しいです。今回の目的は実装変更ではなく、今後ガード位置が動いた場合にも回帰を検出できる恒久テストの完成です。

## Take4必須対応

### 修正対象

- `frontend/src/App.cycle9.test.jsx`
- 実装コードは、テストで不具合が見つからない限り変更しない

### 期待する状態遷移

通常シフトが0件の状態で「最適化シフトを生成」または「空欄自動作成」を押した場合:

- alertを表示する
- fetchしない
- `isGenerating`を有効にしない
- matrixと生成結果全体を変更しない
- Undo/Redo履歴を追加・消去しない

### 受入確認

1. 通常生成の安全停止で、fetchなし・生成結果不変・Undo/Redo状態不変を確認する。
2. 空欄自動作成の安全停止でも、同じ内容を確認する。
3. matrixだけでなく、`shift_generatedResult`全体を実行前後で比較する。
4. Undo/Redoボタンの状態が実行前後で変わらないことを確認する。
5. 標準テストを2回連続PASSし、時刻テスト・build・`git diff --check`もPASSする。

### 触らない範囲

- `resolveAllowedShifts()`を再設計しない。
- バックエンド、solver、DB、API形式を変更しない。
- Cycle 9の他機能を変更しない。
- UI文言やバージョンを不要に変更しない。

## Take3で修正確認済み

- 削除済み・未知IDを現在の通常`shiftMaster`と照合して除外する。
- 有効IDと無効IDの混在時は有効IDだけを送る。
- 重複IDを除去する。
- `__custom__`を`allowed_shifts`から除外する。
- 有効IDが0件なら通常シフト一覧を明示する。
- 通常シフト自体が0件なら、通常生成・空欄自動作成の両方をfetch前に安全停止する。
- Version `v4.33`。
- 無関係差分の混入なし。

## Dex検証

```text
npm.cmd --prefix frontend test
-> 134/134 PASS、142.74秒

npm.cmd --prefix frontend test
-> 134/134 PASS、119.68秒

node frontend/test_time_utils.mjs
-> 33/33 PASS

npm.cmd --prefix frontend run build
-> PASS

git diff --check 5f965de..eaaa472
-> PASS
```

## デクスクルー利用記録

サブレビュー利用: 使用。

- 観点A: payload正規化、solverとの整合、安全停止位置。
- 観点B: 追加テスト、履歴・生成結果不変、バージョン、回帰。
- 統合判断: 実装本体はOK。2名とも同じP2テスト不足を指摘したため採用し、Take4をテスト追加だけに限定する。

## Take4出口

- Version: テストのみの修正なら`v4.33`のまま。実装コードを変更した場合は更新する。
- CCクルー: 不要。追加範囲が明確なテスト2系統だけのため。
- 完了報告:
  `docs/handoff/P3_CC_to_Dex/cycle_9_interactive_editing_and_history_take4_report.md`
- `cc-cycle9`へcommit/pushし、対象HEADをDex(P4)へ報告する。
- `main`へはmergeしない。
