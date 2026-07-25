import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Cycle 5: 「画面固定＆左右スクロールボタン」「スマホ単日カード廃止→マトリクス統合」の
// 恒久コンポーネントテスト。ブラウザ実機確認がこのセッションで継続して不可なため、
// jsdom上の実DOMで検証する。

beforeEach(() => {
    window.localStorage.clear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('ダッシュボード: マトリクス表の常時表示と左右スクロールボタン (Cycle5)', () => {
    it('スマホ幅相当でも単日カードビューではなく、全員分のマトリクス表(テーブル)が表示される', () => {
        render(<App />);

        // 旧: スマホ/PCビュー切替トグルはCycle5で廃止済み
        expect(screen.queryByText('💻 PCビューで表示')).not.toBeInTheDocument();
        expect(screen.queryByText('📱 スマホビューで表示')).not.toBeInTheDocument();

        // マトリクス表(24名分の行を持つテーブル)が常に描画されている
        const table = document.querySelector('table');
        expect(table).not.toBeNull();
        expect(table.querySelectorAll('tbody tr').length).toBe(24);
        // 表のヘッダーに全期間分の日付列があること(単日だけの表示になっていないこと)
        expect(table.querySelectorAll('thead th').length).toBeGreaterThan(20);
    });

    it('月度ヘッダーが1行の表示要素として描画される(3段崩れの旧構造ではない)', () => {
        render(<App />);
        const label = document.querySelector('.month-header-label');
        expect(label).not.toBeNull();
        expect(document.querySelector('.month-header-main').textContent).toMatch(/年.*月度/);
    });

    it('左右スクロールボタンを押すと、マトリクス表のコンテナがscrollByで移動する', () => {
        const scrollBySpy = vi.spyOn(Element.prototype, 'scrollBy').mockImplementation(() => {});
        render(<App />);

        fireEvent.click(screen.getByText('◀ 左へスクロール'));
        fireEvent.click(screen.getByText('右へスクロール ▶'));

        expect(scrollBySpy).toHaveBeenCalledTimes(2);
        expect(scrollBySpy).toHaveBeenNthCalledWith(1, { left: -350, behavior: 'smooth' });
        expect(scrollBySpy).toHaveBeenNthCalledWith(2, { left: 350, behavior: 'smooth' });
    });

    // Cycle5 Take2(Dex差戻し): 固定対象は「氏名列(2列目)」であるべきなのに、
    // Take1では空のドラッグ列(1列目)だけがCSS上left:0で固定されてしまっていた。
    // jsdomはCSSの実適用(position:sticky等)やレイアウト位置を再現しないため、
    // ここでは「固定したいDOM位置(2列目)に本当に氏名が乗っているか」という
    // 構造だけを検証する。実際にスクロールしても視覚的に固定されるかどうかは
    // ブラウザ実機でのみ確認可能(このセッションでは未実施、報告書に明記)。
    it('マトリクス表の2列目(固定対象)に氏名が入っており、1列目はドラッグハンドルのみである', () => {
        render(<App />);
        const table = document.querySelector('table');

        const headerCells = table.querySelectorAll('thead th');
        expect(headerCells[0].textContent.trim()).toBe('');
        expect(headerCells[1].textContent.trim()).toBe('従業員');

        const firstRowCells = table.querySelectorAll('tbody tr')[0].querySelectorAll('td');
        expect(firstRowCells[0].querySelector('.drag-handle-compact')).not.toBeNull();
        expect(firstRowCells[0].textContent).not.toContain('K.D.');
        expect(firstRowCells[1].textContent).toContain('K.D.');
    });
});
