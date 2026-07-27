import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Cycle 7: スマホ左固定列の極限圧縮・氏名タップの詳細ポップオーバー・PCズームの
// 恒久コンポーネントテスト。CSS(幅105px・ellipsis・フロートボタン非表示など)は
// jsdomでは実際の見た目を検証できないため、ここではDOM構造・状態遷移ロジックのみを
// 検証する。実際の見た目・座標はブラウザ実機でのみ確認可能(このセッションでは未実施)。

function setViewportWidth(width) {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

beforeEach(() => {
    window.localStorage.clear();
    setViewportWidth(1280);
});

afterEach(() => {
    setViewportWidth(1280);
});

describe('従業員詳細ポップオーバー (Cycle7)', () => {
    it('氏名セルをクリックすると詳細ポップオーバーが開き、閉じるボタンで閉じる', () => {
        render(<App />);
        const table = document.querySelector('table');
        const nameCell = table.querySelectorAll('tbody tr')[0].querySelectorAll('td')[1];

        fireEvent.click(nameCell);
        expect(screen.getByText(/K\.D\./, { selector: 'h2' })).toBeInTheDocument();
        expect(screen.getByText(/出勤日数/)).toBeInTheDocument();

        fireEvent.click(screen.getByText('閉じる'));
        expect(screen.queryByText('K.D.', { selector: 'h2' })).not.toBeInTheDocument();
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

describe('PCズームコントロール (Cycle7)', () => {
    it('拡大・縮小・100%フィットボタンで表示中のズーム率が変化する', () => {
        render(<App />);
        expect(document.querySelector('.zoom-controls')).not.toBeNull();
        expect(screen.getByText('100%')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '拡大' }));
        expect(screen.getByText('110%')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '拡大' }));
        expect(screen.getByText('120%')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '縮小' }));
        expect(screen.getByText('110%')).toBeInTheDocument();

        fireEvent.click(screen.getByText('100%フィット'));
        expect(screen.getByText('100%')).toBeInTheDocument();
    });
});
