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

// Take2 P1-3(Dex差戻し): 24名×31日の巨大fixture(デフォルトINITIAL_DATA)のままだと
// 標準テスト一括実行時に20秒のtestTimeoutへ達し得る(Dex環境で実測・単独でも再現)。
// このファイルの検証目的(詳細ポップオーバー・ズーム・行ドラッグ)はいずれも
// 従業員数やDOM規模に依存しないため、目的を変えずに2名の小型fixtureへ変更する。
function seedSmallFixture() {
    const employees = [
        { name: '太郎', type: '正社員', isRS: true, isKeyHolder: true, days: 23, shifts: ['④', '⑦'], requests: '', targetHours: null },
        { name: '花子', type: '準社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: null },
    ];
    window.localStorage.setItem('shift_employees', JSON.stringify(employees));
}

// Cycle7 Take3(Dex差戻し): Take2までのモックは「scrollWidth = naturalWidth ×
// 現在のzoom」という前提だったが、これは実ブラウザの挙動と一致しておらず
// (table.scrollWidthをzoom適用後の値として扱えない、min-width:100%の影響も
// あるため)、不具合を検出できなかった。Take3では、実ブラウザに合わせて
// scrollWidth(自然幅)を「zoomに関係なく一定の値」としてモックする。
// clientWidthは`setClientWidth`でテスト中に変更できるようにし、resizeイベント
// による再計算をシミュレートできるようにしている。
// descriptorは従来どおりtry/finallyで復元する。
function withMockedScrollGeometry(initialClientWidth, naturalWidth, fn) {
    const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    const originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    const restore = (name, descriptor) => {
        if (descriptor) {
            Object.defineProperty(HTMLElement.prototype, name, descriptor);
        } else {
            delete HTMLElement.prototype[name];
        }
    };
    let currentClientWidth = initialClientWidth;
    try {
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
            configurable: true,
            get() { return currentClientWidth; },
        });
        Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
            configurable: true,
            get() { return naturalWidth; },
        });
        fn({ setClientWidth: (w) => { currentClientWidth = w; } });
    } finally {
        restore('clientWidth', originalClientWidth);
        restore('scrollWidth', originalScrollWidth);
    }
}

beforeEach(() => {
    window.localStorage.clear();
    seedSmallFixture();
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
        expect(screen.getByText(/太郎/, { selector: 'h2' })).toBeInTheDocument();
        expect(screen.getByText(/出勤日数/)).toBeInTheDocument();

        fireEvent.click(screen.getAllByRole('button', { name: '閉じる' })[0]);
        expect(screen.queryByText(/太郎/, { selector: 'h2' })).not.toBeInTheDocument();
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
// Cycle9(Dex P2指示): 行全体のdraggableを廃止し、左固定列の専用ドラッグハンドル
// (.drag-handle-compact)だけをdraggableにする設計へ変更されたため、判定対象を
// 行(tr)からハンドル要素へ変更した(行を無効化する仕様自体は維持)。
describe('スマホでの行ドラッグ無効化 (Cycle7 Take2)', () => {
    it('320/375/768pxでは行ドラッグハンドルのdraggableがfalseになる', () => {
        for (const width of [320, 375, 768]) {
            setViewportWidth(width);
            const { unmount } = render(<App />);
            const handle = document.querySelector('.drag-handle-compact');
            expect(handle).toHaveAttribute('draggable', 'false');
            unmount();
        }
    });

    it('769/1280pxでは行ドラッグハンドルのdraggableがtrueのままである', () => {
        for (const width of [769, 1280]) {
            setViewportWidth(width);
            const { unmount } = render(<App />);
            const handle = document.querySelector('.drag-handle-compact');
            expect(handle).toHaveAttribute('draggable', 'true');
            unmount();
        }
    });
});

// Cycle7 Take2(Dex差戻し必須修正1): 「画面にフィット」は実寸計算に基づく。
// jsdomは実レイアウトを計算しないため、scrollWidth/clientWidthを直接
// 上書きして「コンテナよりオーバーフローしている」状態を疑似再現する。
describe('PCズームコントロールと実寸フィット (Cycle7 Take3)', () => {
    it('拡大・縮小ボタンで表示中のズーム率が変化する', () => {
        // naturalWidth(自然幅)=800、コンテナ幅=1200(オーバーフローなし)なので、
        // 初期フィット倍率は100%のまま。
        withMockedScrollGeometry(1200, 800, () => {
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
    });

    it('初期表示時点で自然幅とコンテナ幅からフィット倍率を自動計算する(自然幅2000pxがコンテナ幅1000pxに収まる50%へ)', () => {
        withMockedScrollGeometry(1000, 2000, () => {
            render(<App />);
            expect(screen.getByText('50%')).toBeInTheDocument();
        });
    });

    // Cycle7 Take3(Dex差戻し必須修正): フィット済みの状態で再度「画面にフィット」を
    // 押しても倍率が変わらないこと(Take2の不具合: 55%→50%へ縮んでしまっていた)。
    it('フィット済みの状態で「画面にフィット」を押しても倍率は変わらない', () => {
        withMockedScrollGeometry(1000, 2000, () => {
            render(<App />);
            expect(screen.getByText('50%')).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: '画面にフィット' }));
            expect(screen.getByText('50%')).toBeInTheDocument();
        });
    });

    it('拡大後に「画面にフィット」を押すと、初期と同じフィット倍率へ戻る', () => {
        withMockedScrollGeometry(1000, 2000, () => {
            render(<App />);
            expect(screen.getByText('50%')).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: '拡大' }));
            expect(screen.getByText('60%')).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: '画面にフィット' }));
            expect(screen.getByText('50%')).toBeInTheDocument();
        });
    });

    // Cycle7 Take3(Dex差戻し必須修正): コンテナ幅(画面幅)が広がった場合は、
    // 収まる範囲でフィット倍率が上がること(Take2の不具合: 広げても倍率が下がっていた)。
    it('コンテナが広がるとresizeでフィット倍率が上がり、狭く戻すと元の倍率へ戻る', () => {
        withMockedScrollGeometry(1000, 2000, ({ setClientWidth }) => {
            render(<App />);
            expect(screen.getByText('50%')).toBeInTheDocument();

            setClientWidth(1500);
            fireEvent(window, new Event('resize'));
            expect(screen.getByText('75%')).toBeInTheDocument();

            setClientWidth(1000);
            fireEvent(window, new Event('resize'));
            expect(screen.getByText('50%')).toBeInTheDocument();
        });
    });
});

// Cycle7 Take4(Dex差戻し必須修正): 測定中に例外が起きても必ず元のzoomへ復元し、
// 測定失敗時は現在の倍率stateを変更しないことを検証する。
describe('zoom復元保証と例外経路 (Cycle7 Take4)', () => {
    it('scrollWidth測定の瞬間、対象tableのzoomは一時的に100%になっている', () => {
        let zoomDuringMeasurement = null;
        const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
        const originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
        try {
            Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 1000 });
            Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
                configurable: true,
                get() {
                    if (this.tagName === 'TABLE' && zoomDuringMeasurement === null) {
                        zoomDuringMeasurement = this.style.zoom;
                    }
                    return 2000;
                },
            });
            render(<App />);
        } finally {
            if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
            else delete HTMLElement.prototype.clientWidth;
            if (originalScrollWidth) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', originalScrollWidth);
            else delete HTMLElement.prototype.scrollWidth;
        }
        expect(zoomDuringMeasurement).toBe('100%');
    });

    // Cycle7 Take5(Dex差戻し必須修正): 上記の旧テストは、render()完了後(=Reactが
    // setZoomLevelの結果を再描画し終えた後)のtable.style.zoomという「最終値」しか
    // 見ていなかった。そのため、computeFitZoom内の`finally`による復元を削除しても、
    // 直後にReactが新しいzoomLevelで再描画する際に同じ値へ上書きされてしまい、
    // このテストは(誤って)成功し続けてしまう可能性があった(Dex指摘)。
    // 「Stateの再描画を待たずに、computeFitZoom自身が同期的にzoomを元へ戻している」
    // ことを直接証明するため、`table.style.zoom`への書き込みをスパイして、
    // 実際に書き込まれた値の「順序」を検証する。
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
                delete table.style.zoom; // インスタンス側の上書きを外し、prototypeの挙動へ戻す
            }

            // computeFitZoom内で「100%へ変更」→「測定前の60%へ同期的に復元」の順で
            // 書き込まれ、その後にReactの再描画で最終的なフィット倍率(50%)が
            // 書き込まれる。finallyでの復元が無ければ真ん中の'60%'は記録されず、
            // ['100%', '50%']のような並びになるため、この検証は復元処理そのものを
            // 直接証明する(最終値だけを見る旧テストでは検出できなかった観点)。
            expect(zoomWrites).toEqual(['100%', '60%', '50%']);
        });
    });

    it('scrollWidth測定が例外を投げても、元のzoomへ復元され、表示倍率は変更されない', () => {
        withMockedScrollGeometry(1000, 2000, () => {
            render(<App />);
            expect(screen.getByText('50%')).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: '拡大' }));
            expect(screen.getByText('60%')).toBeInTheDocument();

            // scrollWidthの取得を例外に差し替えた状態で「画面にフィット」を押す。
            const previousDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
            Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
                configurable: true,
                get() { throw new Error('scrollWidth測定失敗(テスト用)'); },
            });
            try {
                fireEvent.click(screen.getByRole('button', { name: '画面にフィット' }));
            } finally {
                Object.defineProperty(HTMLElement.prototype, 'scrollWidth', previousDescriptor);
            }

            // 測定失敗時は表示倍率を変更しない(60%のまま)。
            expect(screen.getByText('60%')).toBeInTheDocument();
            // tableのzoomも測定前の60%へ復元されている(100%に固定されたままではない)。
            const table = document.querySelector('table');
            expect(table.style.zoom).toBe('60%');
        });
    });

    it('withMockedScrollGeometryはコールバック内で例外が起きてもprototype descriptorを復元する', () => {
        const originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
        const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');

        expect(() => {
            withMockedScrollGeometry(1000, 2000, () => {
                throw new Error('テスト用の意図的な例外');
            });
        }).toThrow('テスト用の意図的な例外');

        expect(Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth')).toEqual(originalScrollWidth);
        expect(Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')).toEqual(originalClientWidth);
    });
});
