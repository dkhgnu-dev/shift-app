# Cycle 9 Take3 完了報告 (CC → Dex)

## 対象

- branch: `cc-cycle9`
- 差し戻し対象HEAD: `5f965de`
- 差し戻し文書: `docs/handoff/P4_Rollback/cycle_9_interactive_editing_and_history_take3.md`
- Version: v4.32 → **v4.33**
- Take3 実装commit: `b6c235f`

## 変更ファイル

- `frontend/src/App.jsx`
- `frontend/src/App.cycle9.test.jsx`

(`AGENTS.md`・`.cursorrules`・`CLAUDE.md`・`docs/manual_legacy/`・`manuals/` は共通マニュアル同期対象のため、今回のcommit/pushには含めません。)

## Findingへの対応

### P1-1 削除済みシフトIDだけが残ると「全シフト可」へフォールバックする → 修正済み

`resolveAllowedShifts()`を、Dex提示の推奨実装形どおりに書き換えました。

```js
const normalShiftIds = () => Object.keys(shiftMaster).filter(id => !id.startsWith('__custom__'));
const resolveAllowedShifts = (shifts) => {
    const normalSet = new Set(normalShiftIds());
    const valid = [...new Set(Array.isArray(shifts) ? shifts : [])].filter(id => normalSet.has(id));
    return valid.length > 0 ? valid : normalShiftIds();
};
```

- 判定基準を「元配列の長さ」から「**現在の`shiftMaster`に実在する通常IDが1件以上あるか**」へ変更。
- `__custom__`ID・削除済みID・未知IDはすべて`normalSet`との照合で除外される。
- 重複IDは`Set`で1件へ正規化される(`['④','削除済みID','④']` → `['④']`)。
- 絞り込み後が0件(空配列・削除済みIDだけ・未知IDだけ)の場合は、`normalShiftIds()`(自由時間を除く通常シフトID全件)へフォールバックする。

**通常シフト0件時の安全停止**を`generateShift`・`fillBlanks`双方の先頭(`setIsGenerating(true)`より前)へ追加しました。

```js
if (normalShiftIds().length === 0) {
    alert('通常のシフトパターンが1件もありません。ルール設定でシフトパターンを追加してから実行してください。');
    return;
}
```

`try`ブロックへ入る前にreturnするため、fetch自体が送られず、`isGenerating`・表・履歴・生成結果のいずれも変更されません(`finally`の`setIsGenerating(false)`にも到達しないため、`isGenerating`がtrueのまま固着することもありません)。

`deleteShiftPattern()`自体は変更していません。Dexの指摘どおり、従業員側の削除済みID整理はUI表示の一貫性向上に留まる任意対応であり、必須なのはpayload境界(`resolveAllowedShifts`)での検証のため、そちらのみ対応しました。

## CCクルー限定再確認

Take3の修正範囲(`resolveAllowedShifts`と関連テストのみ)に限定してサブエージェントレビューを実施し、以下を確認しました。

- 判定ロジックがDex推奨実装形と完全一致(dedup・現行shiftMasterとの照合・`__custom__`除外・フォールバック)。
- 安全停止ガードが`setIsGenerating(true)`・fetch・状態変更のいずれよりも前に実行され、状態固着や汚染がないこと。
- 新規テスト4件が受入確認の(a)〜(d)を全てカバーしていること。
- `deleteShiftPattern()`は意図的に無変更であり、仕様上問題ないこと。
- 判定: **adequately fixed**。新たな不具合の指摘なし。

## 追加した恒久テスト (`App.cycle9.test.jsx`「Take3 P1-1」describe、4件)

1. `shifts=['⑨_削除済み']`(shiftMaster未存在ID)のみの従業員でも、通常生成のpayloadで通常IDのみが明示される。
2. `shifts=['④','⑨_削除済み','④']`では、存在する`④`だけが重複なく1件送られる(`toEqual(['④'])`)。
3. 空欄自動作成でも、削除済みIDだけの従業員には通常IDのみが明示される。
4. 通常シフトが1件も無い場合、fetchされず、alertが表示され、`実行中`表示も出ず、表(matrix)も変化しない。

## 検証

```text
npm.cmd --prefix frontend test -- src/App.cycle9.test.jsx -> 40/40 PASS（約56〜62秒）
npm.cmd --prefix frontend test   -> 134/134 PASS (1回目, 約117秒)
npm.cmd --prefix frontend test   -> 134/134 PASS (2回目, 約114秒、連続クリーン)
node frontend/test_time_utils.mjs -> ALL PASSED (33/33)
npm.cmd --prefix frontend run build -> 成功
git diff --check -> クリーン(CRLF/LFの警告のみ、エラーなし)
```

## ブラウザ実機確認

引き続きBrowser paneが本プロジェクトと無関係な別アプリに固定される既知の制約があり、今回もコードレベル検証とjsdomテストで代替しています(既承認の既知制約、Take2報告と同様)。

## まだ不安な点

- `deleteShiftPattern()`で従業員側の削除済みID参照を掃除しない設計を維持しました。UI上は「可能シフト」欄に削除済みIDがそのまま表示され続けますが、payload境界では安全に除外されるため実害はない認識です。表示側の整理が必要かはDexのご判断を仰ぎたいです。
- ブラウザ実機確認は引き続き未実施です。

## Dexに特に見てほしい点

- `resolveAllowedShifts`の新しい判定ロジックが、Take3差し戻し文書の受入確認1〜6を過不足なく満たしているか。
- 通常シフト0件時の安全停止が、`generateShift`/`fillBlanks`の他のガード(`isGenerating`チェックなど)と競合しないか。
