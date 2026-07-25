import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// 各テスト後にDOMを片付ける(TimePicker.test.jsxで毎回render()するため必須)。
afterEach(cleanup);

// jsdomはレイアウトを計算しないため Element.prototype.scrollBy が未実装。
// Cycle5のマトリクス左右スクロールボタンのテストで呼び出しを検証できるよう、
// no-opの関数を用意しておく(各テストでvi.spyOn/vi.fnとして上書き可能)。
if (typeof Element !== 'undefined' && !Element.prototype.scrollBy) {
    Element.prototype.scrollBy = function scrollBy() {};
}
