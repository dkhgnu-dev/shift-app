import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Cycle 5/6: 「画面固定＆スクロール導線」「スマホ単日カード廃止→マトリクス統合」の
// 恒久コンポーネントテスト。ブラウザ実機確認がこのセッションで継続して不可なため、
// jsdom上の実DOMで検証する。

beforeEach(() => {
    window.localStorage.clear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('ダッシュボード: マトリクス表の常時表示 (Cycle5)', () => {
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

describe('ダッシュボード: 半透明フロート左右スクロールボタン (Cycle6)', () => {
    it('旧: 表上部の大きな文字入りスクロールボタンは撤去済みである', () => {
        render(<App />);
        expect(screen.queryByText('◀ 左へスクロール')).not.toBeInTheDocument();
        expect(screen.queryByText('右へスクロール ▶')).not.toBeInTheDocument();
        expect(document.querySelector('.matrix-scroll-nav')).toBeNull();
    });

    it('左右のフロートボタンが存在し、クリックするとマトリクス表のコンテナがscrollByで移動する', () => {
        const scrollBySpy = vi.spyOn(Element.prototype, 'scrollBy').mockImplementation(() => {});
        render(<App />);

        fireEvent.click(screen.getByRole('button', { name: '左へスクロール' }));
        fireEvent.click(screen.getByRole('button', { name: '右へスクロール' }));

        expect(scrollBySpy).toHaveBeenCalledTimes(2);
        expect(scrollBySpy).toHaveBeenNthCalledWith(1, { left: -350, behavior: 'smooth' });
        expect(scrollBySpy).toHaveBeenNthCalledWith(2, { left: 350, behavior: 'smooth' });
    });

    // jsdomは実レイアウトを計算しないため(scrollWidth/clientWidthは既定で0)、
    // scrollWidth/clientWidth/scrollLeftをテスト内で直接上書きして「表がまだ右に
    // 隠れている/もう左端まで見えている」状態を疑似的に再現し、フロートボタンの
    // 表示・非表示切り替えロジック自体を検証する。実際のピクセル位置での
    // 見え方はブラウザ実機でのみ確認可能(このセッションでは未実施)。
    it('横スクロールで見えていない方向のボタンだけが表示され、端に達すると同じ側が非表示になる', () => {
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 300 });
        Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, value: 1200 });
        Object.defineProperty(HTMLElement.prototype, 'scrollLeft', { configurable: true, writable: true, value: 0 });

        render(<App />);
        const container = document.querySelector('.table-container');
        const leftBtn = screen.getByRole('button', { name: '左へスクロール' });
        const rightBtn = screen.getByRole('button', { name: '右へスクロール' });

        // 初期状態(左端): 左は隠す、右(まだ隠れているシフト)だけ見せる
        expect(leftBtn.style.opacity).toBe('0');
        expect(rightBtn.style.opacity).toBe('1');

        // 右端まで到達(scrollLeft + clientWidth === scrollWidth)したとみなす
        container.scrollLeft = 900;
        fireEvent.scroll(container);

        expect(leftBtn.style.opacity).toBe('1');
        expect(rightBtn.style.opacity).toBe('0');
    });
});
