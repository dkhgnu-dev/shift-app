import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Cycle 7: スマホ左固定列の極限圧縮・氏名タップの詳細ポップオーバー・PCズームの
// 恒久コンポーネントテスト。CSS(幅105px・ellipsis・フロートボタン非表示など)は
// jsdomでは実際の見た目を検証できないため、ここではDOM構造・状態遷移ロジックのみを
// 検証する。実際の見た目・座標はブラウザ実機でのみ確認可能(このセッションでは未実施)。

function setViewportWidth(width) {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

// Cycle7 Take2(Dex差戻し): scrollWidth/clientWidthのdescriptorを一時的に
// 上書きするヘルパー。Cycle6 Take2の反省を踏まえ、元々自前のdescriptorが
// 無い場合(jsdomではElement.prototype側からの継承)はdeleteで復元する。
//
// scrollWidthは実ブラウザのzoom挙動を模して「naturalWidth(zoom無適用の実寸) ×
// <table>のstyle.zoom値」を返すgetterにしている。単純な固定値にすると、
// computeFitZoom()が2回目以降に呼ばれた際(zoomLevelが既に変化した後)の
// 逆算が壊れてしまうため。
function withMockedScrollGeometry(clientWidth, naturalWidth, fn) {
    const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    const originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    const restore = (name, descriptor) => {
        if (descriptor) {
            Object.defineProperty(HTMLElement.prototype, name, descriptor);
        } else {
            delete HTMLElement.prototype[name];
        }
    };
    try {
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: clientWidth });
        Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
            configurable: true,
            get() {
                const table = this.tagName === 'TABLE' ? this : this.querySelector?.('table');
                const zoomStyle = table?.style?.zoom;
                const fraction = zoomStyle ? parseFloat(zoomStyle) / 100 : 1;
                return naturalWidth * fraction;
            },
        });
        fn();
    } finally {
        restore('clientWidth', originalClientWidth);
        restore('scrollWidth', originalScrollWidth);
    }
}

beforeEach(() => {
    window.localStorage.clear();
    setViewportWidth(1280);
});

afterEach(() => {
    setViewportWidth(1280);
    vi.restoreAllMocks();
});

describe('従業員詳細ポップオーバー (Cycle7)', () => {
    it('氏名セルをクリックすると詳細ポップオーバーが開き、閉じるボタンで閉じる', () => {
        render(<App />);
        const table = document.querySelector('table');
        const nameCell = table.querySelectorAll('tbody tr')[0].querySelectorAll('td')[1];

        fireEvent.click(nameCell);
        expect(screen.getByText(/K\.D\./, { selector: 'h2' })).toBeInTheDocument();
        expect(screen.getByText(/出勤日数/)).toBeInTheDocument();

        fireEvent.click(screen.getAllByRole('button', { name: '閉じる' })[0]);
        expect(screen.queryByText(/K\.D\./, { selector: 'h2' })).not.toBeInTheDocument();
    });

    it('オーバーレイをクリックしてもポップオーバーが閉じる', () => {
        render(<App />);
        const table = document.querySelector('table');
        const nameCell = table.querySelectorAll('tbody tr')[0].querySelectorAll('td')[1];

        fireEvent.click(nameCell);
        expect(document.querySelector('.employee-detail-card')).not.toBeNull();

        fireEvent.click(document.querySelector('.modal-overlay'));
        expect(document.querySelector('.employee-detail-card')).toBeNull();
    });
});

// Cycle7 Take2(Dex差戻し必須修正2): 氏名セルと詳細ダイアログのキーボード操作・
// role/aria属性・フォーカス管理を検証する。
describe('氏名セル・詳細ダイアログのアクセシビリティ (Cycle7 Take2)', () => {
    it('氏名セルはTabで到達でき、Enterで詳細ダイアログが開く', () => {
        render(<App />);
        const table = document.querySelector('table');
        const nameCell = table.querySelectorAll('tbody tr')[0].querySelectorAll('td')[1];

        expect(nameCell).toHaveAttribute('tabindex', '0');
        expect(nameCell).toHaveAttribute('role', 'button');

        fireEvent.keyDown(nameCell, { key: 'Enter' });
        expect(document.querySelector('.employee-detail-card')).not.toBeNull();
    });

    it('氏名セルにフォーカスした状態でSpaceキーでも詳細ダイアログが開く', () => {
        render(<App />);
        const table = document.querySelector('table');
        const nameCell = table.querySelectorAll('tbody tr')[0].querySelectorAll('td')[1];

        fireEvent.keyDown(nameCell, { key: ' ' });
        expect(document.querySelector('.employee-detail-card')).not.toBeNull();
    });

    it('ダイアログはrole="dialog"・aria-modal="true"を持ち、開いた直後は閉じるボタンへフォーカスが移る', () => {
        render(<App />);
        const table = document.querySelector('table');
        const nameCell = table.querySelectorAll('tbody tr')[0].querySelectorAll('td')[1];

        fireEvent.click(nameCell);

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'employee-detail-title');

        const closeBtn = screen.getAllByRole('button', { name: '閉じる' })[0];
        expect(document.activeElement).toBe(closeBtn);
    });

    it('Escapeキーでダイアログが閉じ、開いた起動元(氏名セル)へフォーカスが戻る', () => {
        render(<App />);
        const table = document.querySelector('table');
        const nameCell = table.querySelectorAll('tbody tr')[0].querySelectorAll('td')[1];

        fireEvent.click(nameCell);
        expect(document.querySelector('.employee-detail-card')).not.toBeNull();

        fireEvent.keyDown(document.querySelector('.modal-overlay'), { key: 'Escape' });
        expect(document.querySelector('.employee-detail-card')).toBeNull();
        expect(document.activeElement).toBe(nameCell);
    });

    it('閉じるボタンで閉じても、開いた起動元(氏名セル)へフォーカスが戻る', () => {
        render(<App />);
        const table = document.querySelector('table');
        const nameCell = table.querySelectorAll('tbody tr')[0].querySelectorAll('td')[1];

        fireEvent.click(nameCell);
        fireEvent.click(screen.getAllByRole('button', { name: '閉じる' })[0]);
        expect(document.activeElement).toBe(nameCell);
    });
});

describe('スマホ幅での左固定列圧縮とサブ情報の非表示 (Cycle7)', () => {
    it('スマホ幅では表ヘッダーが「氏名」に短縮され、属性・累積実績のサブ情報がレンダリングされない', () => {
        setViewportWidth(375);
        render(<App />);

        const table = document.querySelector('table');
        const headerCells = table.querySelectorAll('thead th');
        expect(headerCells[1].textContent.trim()).toBe('氏名');

        const firstRowNameCell = table.querySelectorAll('tbody tr')[0].querySelectorAll('td')[1];
        expect(firstRowNameCell.querySelector('.staff-stat-badge')).toBeNull();
        expect(firstRowNameCell.textContent).not.toContain('日 /');
    });

    it('PC幅では表ヘッダーが「従業員」のままで、サブ情報(属性・累積実績)が表示される', () => {
        render(<App />);
        const table = document.querySelector('table');
        const headerCells = table.querySelectorAll('thead th');
        expect(headerCells[1].textContent.trim()).toBe('従業員');

        const firstRowNameCell = table.querySelectorAll('tbody tr')[0].querySelectorAll('td')[1];
        expect(firstRowNameCell.querySelector('.staff-stat-badge')).not.toBeNull();
    });

    it('スマホ幅ではPC用のズームコントロールが描画されない', () => {
        setViewportWidth(375);
        render(<App />);
        expect(document.querySelector('.zoom-controls')).toBeNull();
    });
});

// Cycle7 Take2(Dex差戻し必須修正3): スマホでは行のdraggableを無効化する。
describe('スマホでの行ドラッグ無効化 (Cycle7 Take2)', () => {
    it('320/375/768pxでは行のdraggableがfalseになる', () => {
        for (const width of [320, 375, 768]) {
            setViewportWidth(width);
            const { unmount } = render(<App />);
            const row = document.querySelector('table tbody tr');
            expect(row).toHaveAttribute('draggable', 'false');
            unmount();
        }
    });

    it('769/1280pxでは行のdraggableがtrueのままである', () => {
        for (const width of [769, 1280]) {
            setViewportWidth(width);
            const { unmount } = render(<App />);
            const row = document.querySelector('table tbody tr');
            expect(row).toHaveAttribute('draggable', 'true');
            unmount();
        }
    });
});

// Cycle7 Take2(Dex差戻し必須修正1): 「画面にフィット」は実寸計算に基づく。
// jsdomは実レイアウトを計算しないため、scrollWidth/clientWidthを直接
// 上書きして「コンテナよりオーバーフローしている」状態を疑似再現する。
describe('PCズームコントロールと実寸フィット (Cycle7 Take2)', () => {
    it('拡大・縮小ボタンで表示中のズーム率が変化する', () => {
        render(<App />);
        expect(document.querySelector('.zoom-controls')).not.toBeNull();
        expect(screen.getByText('100%')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '拡大' }));
        expect(screen.getByText('110%')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '拡大' }));
        expect(screen.getByText('120%')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '縮小' }));
        expect(screen.getByText('110%')).toBeInTheDocument();
    });

    it('初期表示時点で実寸に基づき自動フィットする(1600px相当の内容が800pxのコンテナに収まる50%へ)', () => {
        // naturalWidth(zoom無適用時の実寸)=1600px、コンテナ幅=800px。
        withMockedScrollGeometry(800, 1600, () => {
            render(<App />);
            expect(screen.getByText('50%')).toBeInTheDocument();
        });
    });

    it('拡大後に「画面にフィット」を押すと、単純な100%リセットではなく拡大後の実寸から再計算して収まる倍率(83%)へ戻る', () => {
        // naturalWidth=1200px、コンテナ幅=1000px。初期フィット倍率は floor(1000/1200*100)=83%。
        withMockedScrollGeometry(1000, 1200, () => {
            render(<App />);
            expect(screen.getByText('83%')).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: '拡大' }));
            expect(screen.getByText('93%')).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: '画面にフィット' }));
            // 単純にsetZoomLevel(100)へ戻すなら100%になってしまうが、実寸から
            // 再計算するため、オーバーフローしない83%へ戻ることを確認する。
            expect(screen.getByText('83%')).toBeInTheDocument();
        });
    });
});
