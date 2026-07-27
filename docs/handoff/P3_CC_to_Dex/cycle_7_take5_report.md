[C7 Take5: CC(P3) ⇒ Dex(P4)]

# P3 完了報告 Take5: 成功時zoom復元の恒久テスト強化(state再描画前の直接保証)

- 対象ブランチ: `cc-cycle7`
- レビュー対象HEAD: `ca48025`（push済み、`d392ecb..ca48025`）
- 対応した指摘: `docs/handoff/P4_Rollback/cycle_7_take5_request.md`（Dex差戻し、Reviewed HEAD: `c042557`）

## 対応内容

### 指摘内容の要約

Take4で追加した「測定成功後、tableのzoomは100%に固定されたままにならず、算出した倍率が適用される」テストは、`fireEvent.click`後・Reactの再描画完了後の`table.style.zoom`の**最終値のみ**を検証していました。Dexの指摘通り、この検証方法では、`computeFitZoom()`内の`finally`による同期的な復元処理を仮に削除しても、その後Reactが`zoomLevel` stateに基づいて同じ値(`table.style.zoom`)を再描画時に書き込むため、テストが誤って成功してしまう可能性がありました。つまり「`finally`の復元が実際に実行されたこと」を直接には保証していませんでした。

### 修正: プロパティ書き込み順序を直接記録するテストへ置き換え

`frontend/src/App.cycle7.test.jsx`内の対象テストを、`table.style`インスタンスの`zoom`プロパティへの書き込みを`Object.defineProperty`でスパイし、書き込まれた値の**順序そのもの**を記録・検証する方式に置き換えました。

```js
it('測定成功時、Reactの再描画を待たずcomputeFitZoom内で同期的にzoomが測定前の値へ復元される(state再描画前の直接保証)', () => {
    withMockedScrollGeometry(1000, 2000, () => {
        render(<App />);
        expect(screen.getByText('50%')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '拡大' }));
        expect(screen.getByText('60%')).toBeInTheDocument();

        const table = document.querySelector('table');
        const zoomWrites = [];
        const styleProto = Object.getPrototypeOf(table.style);
        const originalZoomDescriptor = Object.getOwnPropertyDescriptor(styleProto, 'zoom');
        Object.defineProperty(table.style, 'zoom', {
            configurable: true,
            get() { return originalZoomDescriptor.get.call(table.style); },
            set(value) {
                zoomWrites.push(value);
                originalZoomDescriptor.set.call(table.style, value);
            },
        });

        try {
            fireEvent.click(screen.getByRole('button', { name: '画面にフィット' }));
        } finally {
            delete table.style.zoom;
        }

        expect(zoomWrites).toEqual(['100%', '60%', '50%']);
    });
});
```

**このテストが保証する内容**:

1. `'100%'` — `computeFitZoom()`が自然幅を測るために一時的に`zoom`を`100%`へ書き換える瞬間。
2. `'60%'` — `computeFitZoom()`の`finally`ブロックが、測定完了直後・Reactの再描画を待たずに、測定前の値(このテストでは拡大後の`60%`)へ**同期的に**復元する書き込み。この書き込みが実際に発生していることが、`zoomWrites`配列の要素として直接記録される。
3. `'50%'` — その後、`setZoomLevel(50)`によるReactの再描画で、最終的なフィット倍率`50%`が書き込まれる。

`finally`の復元処理を仮に削除すると、書き込み順序は`['100%', '50%']`（2回目の復元書き込みが発生しない）になり、`toEqual(['100%', '60%', '50%'])`との比較で確実に失敗します。これにより、Dexが指摘した「`finally`削除でも通ってしまう」弱点を解消しました。

なお、書き込みスパイは`table.style`インスタンスに対して`configurable: true`で一時的に定義し、テスト末尾で`delete table.style.zoom`によりインスタンス側の上書きを外して`prototype`本来の挙動へ戻しています（他のテストへの影響なし）。

## 変更ファイル

- `frontend/src/App.cycle7.test.jsx`（対象テスト1件を書き込み順序スパイ方式へ置き換え。他のテストは変更なし）

**`frontend/src/App.jsx`は変更していません。** 指示通り、原則として本番コードには一切手を入れていません。バージョン表記も`v4.29`のまま変更していません。

正常系のフィット倍率計算式・ダイアログアクセシビリティ・スマホ行ドラッグ無効化・UIレイアウトと固定列・シフト自動生成ロジックには触れていません。

## 検証内容

### 標準検証コマンド

```text
npm --prefix frontend test    -> 1回目: Test Files 4 passed / Tests 42 passed
npm --prefix frontend test    -> 2回目: Test Files 4 passed / Tests 42 passed
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
git diff --check              -> 問題なし
```

対象の新テストは、単体実行(`npx vitest run src/App.cycle7.test.jsx`)でも21/21 PASSを確認済みです。

## 実機確認について（重要・未実施）

**このセッションでもブラウザでの実機確認ができていません。** Cycle 5〜7と同じ理由で、このセッションのBrowserペインが別プロジェクトのdevサーバー設定に固定されており、今回も実機確認ができない状況です。今回の変更はテストコードのみで本番コード(`App.jsx`)には触れていないため、実機での挙動そのものへの影響はない想定ですが、念のためDexまたはkazumax側でのご確認をお願いします。

## Kazumax確認レベル

確認不要（テストコードのみの修正で、本番コード・バージョン表記は変更していないため）。ただしDexのP4再レビューは必須です。
