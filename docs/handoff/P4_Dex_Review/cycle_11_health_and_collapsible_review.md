# Cycle 11 P4 DIFFレビュー

## 判定

**P4 NG / Take2差し戻し**

- Reviewed branch: `cc-cycle11`
- Reviewed HEAD: `e572212fd599951f0e2668a4ab4fd58e4049a28a`
- Implementation base: `803271d`
- Main integration: 未実施
- Kazumax確認レベル: 確認不要（CC Take2とDex再レビューを先に行う）

主要機能の構成、6連勤・11時間境界、派生再計算、28px折りたたみ、sticky、セル操作、versionは概ねP2どおり。バックエンド、solver、保存形式、Vitest設定への範囲外変更もない。ただし、時刻不正を安全側で拒否する契約と、折りたたみ時のzoom再計測を恒久的に守るテストに不足がある。

## Findings

### [P2] 区切り文字が複数ある壊れた時刻を正常値として受理する

- 対象: `frontend/src/cycle11Utils.js:23-28`
- 現状: `timeStr.includes('～')` の後、`split('～')` の先頭2要素だけを使う。
- 再現例: `8:15～17:30～不正値`
- 結果: 末尾の不正値が無視され、`8:15～17:30` の勤務として連勤・休息警告へ使われる。

P2では、時刻形式不正・未知IDは判定不能として連勤を切り、休息警告にも使わないと確定している。通常UIから作りにくい値でも、既存localStorageの破損、手編集、将来の移行値に対して誤警告を出すため修正が必要。

期待:

- `～` がちょうど1個、開始・終了の2要素だけであることを厳密確認する。
- 余分な要素、空要素、分範囲外、`end <= start` は `null`。
- `isWorkingCell` でも非勤務として安全停止する。

### [P2] Cycle 11のzoomテストが「折りたたみで再計測されたこと」を証明しない

- 対象: `frontend/src/App.cycle11.test.jsx:153-163`
- 現状: 切替前後の最終値がどちらも `table.style.zoom === '100%'` であることだけを確認する。
- 問題: `isNameColumnCollapsed` を再計測effectの依存から外しても、`computeFitZoom()` を呼ばなくても、このテストはPASSする。

P2では、折りたたみでDOM幅が変わった後にzoom-fitとスクロール状態を再計測することを恒久テスト条件としている。既存 `App.cycle7.test.jsx` のgeometry mock方式を再利用し、折りたたみ前後で自然幅または期待fitが変わる条件を作り、zoom表示が変化し、再展開で戻ることを確認する。

最終値だけを見るproxyテストは、実際の再計測を証明するテストへ置き換える。

### [P3] トグルがP2指定のLucideアイコンではなく絵文字・文字記号になっている

- 対象: `frontend/src/App.jsx:1716`
- 現状: `👁️ 展開` / `◀ 折畳`
- P2: 既存Lucideアイコンを使い、独自SVGや記号へ寄せない。

既にimport済みの `ChevronLeft` / `ChevronRight` 等を使い、動的 `aria-label`、`title`、44pxタップ領域、見える日本語ラベルは維持する。

## 良かった点

- `buildHealthAlerts` は行ごとの1回走査で O(E * D)。
- 警告を保存データやUndo/Redo履歴へ混ぜず、`useMemo` の派生値にしている。
- 5/6/7連勤、11時間境界、24:00、特殊勤務分類を純粋関数テストで確認している。
- 警告バッジは非操作要素で、既存の全面セルbuttonとpointer契約を維持している。
- 折りたたみはUI専用stateで、通常幅、sticky offset、スマホ境界を壊していない。
- Dex実測でもPC折りたたみ時のCSS幅約28px、`left: 40px`、氏名列右端と日付列左端の一致を確認した。
- `v4.36`、`main`未統合、範囲外コード変更なし。

## Dex独立検証

- Cycle 11対象: 40/40 PASS
- 全体: 180/180 PASS、timeout 0
- `frontend/test_time_utils.mjs`: 33/33 PASS
- production build: PASS
- `git diff --check 803271d..e572212`: PASS
- ブラウザ: v4.36、PC折りたたみ、28px CSS幅、sticky、列境界を確認

既存テストがすべてPASSしても、上記2件を検出できないためTake2が必要。

## デクスクルー統合結果

使用理由: 健康判定ロジック、レスポンシブUI、pointer操作、zoomテストが複数責務にまたがるため。

- デクスクルーA: 壊れた時刻文字列の厳密拒否漏れを検出。採用。
- デクスクルーB: zoom再計測テストの非検出性、CSS契約の自動確認不足を指摘。zoom項目を採用。28px/stickyは静的確認とDexブラウザ実測が揃ったため、追加の必須差し戻しにはしない。
- 最終判断: Dexが上記3件へ整理し、Take2差し戻しとする。

## 残余リスク

- 日をまたぐ勤務は現行仕様外であり、引き続き判定不能とする。
- jsdomだけではsticky実座標を保証できないため、Take2でも既存のブラウザ実測結果を維持し、変更箇所に応じて再確認する。

