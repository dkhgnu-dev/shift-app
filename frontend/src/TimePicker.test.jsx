import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { TimePicker } from './App';

// TimePicker(Cycle2 Take2/Take3/Take4)の恒久コンポーネントテスト。
// このセッションのBrowserペインが別プロジェクトのdevサーバー設定に固定され
// ブラウザ実機確認ができないため、Dex Take3差戻し(P1-1)の代替として、
// 実際のDOMイベント(click/change/keydown/blur)を使った検証をここに残す。
const CLICK_TO_EDIT_TITLE = 'タップして「0930」のように4桁で直接入力';

function ControlledTimePicker({ initial }) {
    const [value, setValue] = useState(initial);
    return <TimePicker value={value} onChange={setValue} />;
}

function startEditing() {
    fireEvent.click(screen.getByTitle(CLICK_TO_EDIT_TITLE));
    return screen.getByRole('textbox');
}

describe('TimePicker', () => {
    it('中央表示をタップして0930を入力しEnterで確定すると09:30になる', () => {
        render(<ControlledTimePicker initial="09:00" />);
        const input = startEditing();
        fireEvent.change(input, { target: { value: '0930' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(screen.getByText('09:30')).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('09:30の表示から1500を入力しEnterで確定すると15:00になる', () => {
        render(<ControlledTimePicker initial="09:30" />);
        const input = startEditing();
        fireEvent.change(input, { target: { value: '1500' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(screen.getByText('15:00')).toBeInTheDocument();
    });

    it('Enterの代わりにblur(フォーカスアウト)でも確定する', () => {
        render(<ControlledTimePicker initial="09:00" />);
        const input = startEditing();
        fireEvent.change(input, { target: { value: '1230' } });
        fireEvent.blur(input);
        expect(screen.getByText('12:30')).toBeInTheDocument();
    });

    it('Escapeでは値を変更せず編集前の表示へ戻る', () => {
        render(<ControlledTimePicker initial="09:00" />);
        const input = startEditing();
        fireEvent.change(input, { target: { value: '1500' } });
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(screen.getByText('09:00')).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('2400は24:00として確定される(24を0に丸めない)', () => {
        render(<ControlledTimePicker initial="09:00" />);
        const input = startEditing();
        fireEvent.change(input, { target: { value: '2400' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(screen.getByText('24:00')).toBeInTheDocument();
    });

    it('不正な24時台(2430)はEnterで確定しても編集前の値のまま変わらない', () => {
        render(<ControlledTimePicker initial="09:00" />);
        const input = startEditing();
        fireEvent.change(input, { target: { value: '2430' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(screen.getByText('09:00')).toBeInTheDocument();
    });

    it('編集中は4つの矢印ボタンがすべてdisabledになり、クリックしてもonChangeが呼ばれない(Take2/Take3差戻しの回帰防止)', () => {
        const handleChange = vi.fn();
        render(<TimePicker value="09:00" onChange={handleChange} />);
        const input = startEditing();
        fireEvent.change(input, { target: { value: '1500' } });

        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(4);
        buttons.forEach((button) => expect(button).toBeDisabled());

        buttons.forEach((button) => fireEvent.click(button));
        // disabledなので、編集中に矢印を押しても親のonChangeは一切呼ばれない。
        // (Take2で発生した「blur確定値を旧時刻基準の矢印処理が上書きする」競合は、
        // クリック自体が発火しなくなったことで構造的に起こり得ない)
        expect(handleChange).not.toHaveBeenCalled();

        fireEvent.keyDown(input, { key: 'Enter' });
        expect(handleChange).toHaveBeenCalledWith('15:00');
    });

    it('編集終了後は矢印が再有効化され、確定済みの値を基準に時+1する', () => {
        render(<ControlledTimePicker initial="09:00" />);
        const input = startEditing();
        fireEvent.change(input, { target: { value: '1500' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(screen.getByText('15:00')).toBeInTheDocument();

        const [hourUp] = screen.getAllByRole('button');
        expect(hourUp).not.toBeDisabled();
        fireEvent.click(hourUp);
        expect(screen.getByText('16:00')).toBeInTheDocument();
    });

    it('24:00保持: 23:45から時+1で24:00になり、分は0に固定される(既存回帰)', () => {
        render(<ControlledTimePicker initial="23:45" />);
        const [hourUp] = screen.getAllByRole('button');
        fireEvent.click(hourUp);
        expect(screen.getByText('24:00')).toBeInTheDocument();
    });

    it('分+15の既存矢印ステップを維持する(既存回帰)', () => {
        render(<ControlledTimePicker initial="09:00" />);
        const buttons = screen.getAllByRole('button');
        const minuteUp = buttons[2];
        fireEvent.click(minuteUp);
        expect(screen.getByText('09:15')).toBeInTheDocument();
    });
});
