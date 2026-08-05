# Cycle 13 Take2 完了報告 (CC → Dex)

## 対象

- branch: `cc-cycle13-generation-ui-stamp-toggle`
- 差戻し指示: `docs/handoff/P4_Rollback/cycle_13_generation_ui_and_stamp_toggle_take2.md`
- 差戻しレビュー対象コード: `f36d6f4`
- Take2実装commit: `181a826`
- Version: v4.48 → **v4.49**（出荷挙動が変わるため1回だけ+1）
- `main`へはmergeしていません。

## 変更ファイル

- `frontend/src/cycle12Utils.js`
- `frontend/src/cycle12Utils.test.jsx`
- `frontend/src/App.jsx`
- `frontend/src/App.cycle12.test.jsx`
- `docs/handoff/CURRENT_STATUS.md`

(`AGENTS.md`・`manuals/`配下は共通マニュアル同期対象のため、commit/pushには含めません。)

## P1修正: 特殊スタンプ4種の初期計上時間を固定8hへ

### 1. 固定8hの製品ルール化（差戻し要求1・4）

`computeEarlyShiftHours(shiftMaster, fallbackHours)`（早番①の時間帯から差分を算出する関数）を**完全に削除**し、以下へ置換しました。

```js
// cycle12Utils.js
export const SPECIAL_STAMP_DEFAULT_HOURS = 8;

export function resolveStampHours(shiftId) {
    return isSpecialStampShift(shiftId) ? SPECIAL_STAMP_DEFAULT_HOURS : undefined;
}
```

`resolveStampHours()` の引数は `shiftId` のみで、`shiftMaster` を受け取りません。したがって `①` / `③` の設定を変更・削除しても、算出経路そのものが存在せず既定値は8hのまま変わりません。承認時の参照が `③`(8:15～16:15) であることはコメントに明記しましたが、コードは `③` からも計算していません。

`App.jsx` の `applyStamp()` は次のとおりです。

```js
const newCell = buildStampedCell(shiftId, resolveStampHours(shiftId));
```

`buildStampedCell()` の仕様（有限数のときだけ `hours` を明示保存）は変更していないため、通常シフト・自由時間・休・希望休のセルは従来どおり `hours` を持ちません。

### 2. スタンプ後の個別編集の維持（差戻し要求2）

セル編集モーダルの経路は一切変更していません。スタンプで置いた `{ shift: '有休', hours: 8, isFixed: true, isError: false }` を、スタンプOFFのまま通常どおり開いて任意の時間へ変更できることを恒久テストで確認しています。

### 3. パレット表示（差戻し要求3）

`buildStampCandidates()` の特殊スタンプ候補は `label: id` のままで、`8h` や時間帯を付けていません。表示が短い名前のみであることを、`textContent` の完全一致で検証する恒久テストを新設しました。

## テスト（差戻し要求5）

### 純粋関数 `cycle12Utils.test.jsx`

- `computeEarlyShiftHours` のdescribe（①由来の4h算出・フォールバック）を**削除**。
- 新規describe `resolveStampHours (Cycle13 4-1 Take2: 固定8h)`
  - `SPECIAL_STAMP_DEFAULT_HOURS === 8` と、4種すべてが `8` を返すこと。
  - 通常(`①`/`③`)・自由時間・休・希望休・消しゴムは `undefined`（hoursを持たせない）。
  - `resolveStampHours.length === 1`（`shiftMaster` を引数に取らない＝設定に依存しようがない）ことを構造的に固定。
- `buildStampedCell` の期待値 `hours: 4` → `hours: 8` へ更新。

### コンポーネント `App.cycle12.test.jsx`

- **4種すべての8hテスト（table-driven）**: `it.each(['有休','応援','勉強会','店長会'])` で、許可シフト一覧に含まれない従業員に対しても `{ shift, isFixed: true, isError: false, hours: 8 }` が保存されることを検証。
- **`①`/`③` 変更・削除の回帰テスト（table-driven）**: `shift_custom_master` を
  1. `①`を8:15～10:15へ短縮
  2. `③`を8:15～10:15へ短縮
  3. `①`と`③`をどちらも削除

  の3パターンにして、いずれも初期hoursが8hのまま変わらないことを検証。
- **パレット表示テスト**: 4種のボタン `textContent` が短い名前と完全一致すること（`8h`・時間帯を付けない）。
- **既存の編集・トグル・消しゴムテスト**: `hours: 4` 前提だった箇所を8hへ更新（通常編集で8→6へ変更できること、同値再タップで `hours`/`note` を残さず完全空欄化すること、全画面表示中の有休スタンプも `hours: 8` になること）。消しゴム・トグル・Undo/Redo・requests同期の既存テストはそのまま維持し、全件PASSを確認しています。

## 検証

```text
node scripts/check_version_gate.mjs -> PASS: App and CURRENT_STATUS are v4.49.
npm.cmd --prefix frontend test -- src/cycle12Utils.test.jsx src/App.cycle12.test.jsx -> 67/67 PASS
npm.cmd --prefix frontend test -> 254/254 PASS (1回目, 約230秒)
npm.cmd --prefix frontend test -> 254/254 PASS (2回目, 約213秒、連続クリーン)
npm.cmd --prefix frontend run build -> 成功
git diff --check -> クリーン(CRLF/LFの警告のみ、エラーなし)
```

## CCクルー利用記録

**未使用。** 今回はP4差戻しのP1 1件のみで、判定分岐を増やさず「算出を固定値へ置換する」縮小方向の変更です（`applyStamp()` の判定順序・履歴・requests同期の構造は無変更）。Take1でCCクルーがadequately implemented判定した領域に手を入れていないため、恒久テストによる検証で十分と判断しました。

## ブラウザ実機確認

本セッションでもBrowser paneが本プロジェクトと無関係な別アプリ（「シフトカレンダー」）に固定される既知の制約が継続しています。Kazumaxに承認済みの方針どおり、コードレベル検証とjsdomコンポーネントテストで代替し、実表示・実タッチ操作は未実施です。

## まだ不安な点

- 既存の保存済みシフト（Take1のv4.48で `hours: 4` として保存された特殊スタンプセル）は、そのまま4hとして残ります。今回はマイグレーションを行っていません（保存形式・既存データに触るのは危険領域のため、必要ならDex/Kazumaxの判断を仰ぎます）。
- `App.jsx` の既存定数 `DEFAULT_SPECIAL_HOURS = 8`（hours未指定セルの表示・集計フォールバック）と、新設の `SPECIAL_STAMP_DEFAULT_HOURS = 8`（スタンプ書込時の明示値）は値が同じですが役割が別のため、あえて統合していません。統合すべきかご判断ください。

## Dexに特に見てほしい点

- `resolveStampHours()` が `shiftMaster` を受け取らない設計で、要求1「①/③から算出しない」を構造的に満たしているか。
- 上記「既存データの4hセルを移行しない」判断が妥当か。
