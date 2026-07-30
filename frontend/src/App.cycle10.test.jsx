import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import App from './App';

// Cycle10 Take2(Dex差戻し): スマホ全面UI最適化(下部バーのハンバーガー化・外枠余白・氏名列)
// のレスポンシブ契約を恒久テスト化する。既存135件はPC側の従来導線が中心のため、
// 「タブ×画面幅」ごとの下部バー/余白クラス/ハンバーガー領域の組み合わせを個別に固定する。

function setViewportWidth(width) {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

function seedSmallFixture() {
    const employees = [
        { name: '太郎', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: null },
        { name: '花子', type: '準社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: null },
    ];
    window.localStorage.setItem('shift_employees', JSON.stringify(employees));
}

function clickNav(label) {
    const navItems = Array.from(document.querySelectorAll('.nav-item'));
    const target = navItems.find(n => n.textContent.includes(label));
    fireEvent.click(target);
}

beforeEach(() => {
    window.localStorage.clear();
    setViewportWidth(1280);
});

afterEach(() => {
    setViewportWidth(1280);
});

describe('Cycle10 Take2: スマホ下部バー撤去とハンバーガー統合のレスポンシブ契約', () => {
    it('768px以下・ダッシュボードタブ: 下部固定バーが無く、3操作はハンバーガー内にのみ存在する', () => {
        setViewportWidth(768);
        seedSmallFixture();
        render(<App />);

        expect(document.querySelector('.mobile-bottom-bar')).toBeNull();
        expect(document.querySelector('.main-content').classList.contains('has-mobile-bottom-bar')).toBe(false);

        expect(screen.getByRole('button', { name: /希望休ランダム入力/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /空欄自動作成/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /最適化シフトを生成/ })).toBeInTheDocument();
    });

    it('768px以下・従業員管理タブ: 下部固定バーがあり、main-contentにhas-mobile-bottom-barが付く', () => {
        setViewportWidth(768);
        seedSmallFixture();
        render(<App />);
        clickNav('従業員管理');

        const bottomBar = document.querySelector('.mobile-bottom-bar');
        expect(bottomBar).not.toBeNull();
        expect(document.querySelector('.main-content').classList.contains('has-mobile-bottom-bar')).toBe(true);
        expect(screen.getByRole('button', { name: /デフォルトリセット/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /新規追加/ })).toBeInTheDocument();
    });

    it('768px以下・ルール設定タブ: 下部固定バーも余白クラスも付かない', () => {
        setViewportWidth(768);
        seedSmallFixture();
        render(<App />);
        clickNav('ルール設定');

        expect(document.querySelector('.mobile-bottom-bar')).toBeNull();
        expect(document.querySelector('.main-content').classList.contains('has-mobile-bottom-bar')).toBe(false);
    });

    it('769px以上: PCヘッダーの3操作を維持し、下部固定バーもハンバーガードロワー操作も描画しない', () => {
        setViewportWidth(769);
        seedSmallFixture();
        render(<App />);

        expect(screen.getByRole('button', { name: /希望休ランダム入力/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /空欄自動作成/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /最適化シフトを生成/ })).toBeInTheDocument();
        expect(document.querySelector('.mobile-bottom-bar')).toBeNull();
        expect(document.querySelector('.sidebar-mobile-actions')).toBeNull();

        clickNav('従業員管理');
        expect(document.querySelector('.mobile-bottom-bar')).toBeNull();
    });

    it('ハンバーガーボタンのCSS契約: .hamburger-btnは幅・高さとも44px以上を維持する(jsdomはレイアウト計算しないためCSSソースを直接検証)', () => {
        const cssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.css');
        const css = readFileSync(cssPath, 'utf-8');
        const match = css.match(/\.hamburger-btn\s*\{([^}]*)\}/);
        expect(match, '.hamburger-btn ルールがindex.cssに見つかりません').not.toBeNull();
        const body = match[1];
        const widthMatch = body.match(/(?:^|[^-])width:\s*(\d+(?:\.\d+)?)px/);
        const heightMatch = body.match(/(?:^|[^-])height:\s*(\d+(?:\.\d+)?)px/);
        expect(widthMatch, '.hamburger-btnにwidth(px)指定が見つかりません').not.toBeNull();
        expect(heightMatch, '.hamburger-btnにheight(px)指定が見つかりません').not.toBeNull();
        expect(Number(widthMatch[1])).toBeGreaterThanOrEqual(44);
        expect(Number(heightMatch[1])).toBeGreaterThanOrEqual(44);
    });
});
