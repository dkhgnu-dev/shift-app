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

// Cycle6 Take2(Dex差戻し): scrollWidth/clientWidth/scrollLeftのdescriptorを
// HTMLElement.prototypeへ一時的に上書きするヘルパー。try/finallyで必ず元の
// 状態へ復元し、他テストの実行順序に影響しないようにする。
// 注意: jsdomではこれらは通常Element.prototype側の継承プロパティであり、
// HTMLElement.prototype自身は「独自のdescriptorを持たない(undefined)」。
// 復元時にundefinedをdefinePropertyへ渡すとエラーになるため、
// 元々自前のdescriptorが無かった場合はdeleteで独自定義を取り除き、
// 継承元(Element.prototype)のふるまいへ単純に戻す。
function withMockedScrollGeometry(clientWidth, scrollWidth, fn) {
    const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    const originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    const originalScrollLeft = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollLeft');
    const restore = (name, descriptor) => {
        if (descriptor) {
            Object.defineProperty(HTMLElement.prototype, name, descriptor);
        } else {
            delete HTMLElement.prototype[name];
        }
    };
    try {
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: clientWidth });
        Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, value: scrollWidth });
        Object.defineProperty(HTMLElement.prototype, 'scrollLeft', { configurable: true, writable: true, value: 0 });
        fn();
    } finally {
        restore('clientWidth', originalClientWidth);
        restore('scrollWidth', originalScrollWidth);
        restore('scrollLeft', originalScrollLeft);
    }
}

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

// Cycle6 Take2: `aria-hidden="true"`は@testing-library/domのgetByRoleから
// 意図通り除外される(アクセシビリティツリーに存在しない要素として扱われる)ため、
// 非表示状態のボタンはgetByRole(name:...)で見つからない。これは必須修正3が
// 正しく効いている証拠でもあるが、テストからボタン自体を掴む手段としては
// querySelectorを使う(表示/非表示どちらの状態でも取得できるように)。
const leftFloatBtn = () => document.querySelector('.matrix-float-btn-left');
const rightFloatBtn = () => document.querySelector('.matrix-float-btn-right');

describe('ダッシュボード: 半透明フロート左右スクロールボタン (Cycle6)', () => {
    it('旧: 表上部の大きな文字入りスクロールボタンは撤去済みである', () => {
        render(<App />);
        expect(screen.queryByText('◀ 左へスクロール')).not.toBeInTheDocument();
        expect(screen.queryByText('右へスクロール ▶')).not.toBeInTheDocument();
        expect(document.querySelector('.matrix-scroll-nav')).toBeNull();
    });

    it('左右のフロートボタンが操作可能な状態のとき、クリックするとマトリクス表のコンテナがscrollByで移動する', () => {
        const scrollBySpy = vi.spyOn(Element.prototype, 'scrollBy').mockImplementation(() => {});
        // 両方向とも操作可能になるよう、中間スクロール位置(左端でも右端でもない)を疑似再現する。
        withMockedScrollGeometry(300, 1200, () => {
            render(<App />);
            const container = document.querySelector('.table-container');
            container.scrollLeft = 500;
            fireEvent.scroll(container);

            expect(leftFloatBtn()).not.toBeDisabled();
            expect(rightFloatBtn()).not.toBeDisabled();

            fireEvent.click(leftFloatBtn());
            fireEvent.click(rightFloatBtn());

            expect(scrollBySpy).toHaveBeenCalledTimes(2);
            expect(scrollBySpy).toHaveBeenNthCalledWith(1, { left: -350, behavior: 'smooth' });
            expect(scrollBySpy).toHaveBeenNthCalledWith(2, { left: 350, behavior: 'smooth' });
        });
    });

    // jsdomは実レイアウトを計算しないため(scrollWidth/clientWidthは既定で0)、
    // scrollWidth/clientWidth/scrollLeftをテスト内で直接上書きして「表がまだ右に
    // 隠れている/もう左端まで見えている」状態を疑似的に再現し、フロートボタンの
    // 表示・非表示切り替えロジック自体を検証する。実際のピクセル位置での
    // 見え方はブラウザ実機でのみ確認可能(このセッションでは未実施)。
    it('横スクロールで見えていない方向のボタンだけが操作可能になり、端に達すると同じ側が無効化される', () => {
        withMockedScrollGeometry(300, 1200, () => {
            render(<App />);
            const container = document.querySelector('.table-container');

            // 初期状態(左端): 左は無効化、右(まだ隠れているシフト)だけ操作可能
            expect(leftFloatBtn()).toBeDisabled();
            expect(rightFloatBtn()).not.toBeDisabled();

            // 右端まで到達(scrollLeft + clientWidth === scrollWidth)したとみなす
            container.scrollLeft = 900;
            fireEvent.scroll(container);

            expect(leftFloatBtn()).not.toBeDisabled();
            expect(rightFloatBtn()).toBeDisabled();
        });
    });

    // Cycle6 Take2(Dex差戻し必須修正3): 無効化された側はdisabled属性により、
    // ポインター操作・Tabフォーカス・Enter/Space実行のいずれも不可能であり、
    // aria-hiddenで支援技術からも除外されていることを確認する。
    it('無効化されたボタンはTabフォーカス対象から外れ、支援技術から隠される', () => {
        withMockedScrollGeometry(300, 1200, () => {
            render(<App />);
            const leftBtn = leftFloatBtn();

            expect(leftBtn).toBeDisabled();
            expect(leftBtn).toHaveAttribute('tabindex', '-1');
            expect(leftBtn).toHaveAttribute('aria-hidden', 'true');
        });
    });

    // Cycle6 Take2(Dex差戻し必須修正2): ダッシュボードは`activeTab`で条件付き描画され、
    // 他タブへ移動すると`table-container`ごとアンマウントされる。戻ったときに
    // 新しいDOM(scrollLeft=0)を再計測せず、離脱前の古い表示状態のままにならないことを確認する。
    it('横スクロール後に他タブへ移動しダッシュボードへ戻ると、新しい表を再計測して端状態が正しく戻る', () => {
        withMockedScrollGeometry(300, 1200, () => {
            render(<App />);
            const container = document.querySelector('.table-container');
            container.scrollLeft = 900;
            fireEvent.scroll(container);
            expect(leftFloatBtn()).not.toBeDisabled();

            fireEvent.click(screen.getByText('従業員管理'));
            expect(document.querySelector('.table-container')).toBeNull();

            fireEvent.click(screen.getByText('全体シフト表'));

            // 再マウントされた新しいtable-containerはscrollLeft=0からスタートするため、
            // 左は再び無効化され、右だけが操作可能に戻ること。
            expect(leftFloatBtn()).toBeDisabled();
            expect(rightFloatBtn()).not.toBeDisabled();
        });
    });
});
