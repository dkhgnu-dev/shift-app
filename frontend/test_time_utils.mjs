// TimePicker/特殊シフト時間バリデーションの純粋関数の恒久回帰テスト。
// フレームワーク不要でNodeから直接実行できる(プロジェクトの既存慣習に合わせたシンプルスクリプト)。
//
// 使い方:
//   cd frontend
//   node test_time_utils.mjs

import {
    MAX_TIME_PICKER_HOUR,
    computeHourChange,
    computeMinuteChange,
    formatTime,
    isValidSpecialHours,
    parseFourDigitTime,
    parseStrictNumber,
} from './src/timeUtils.js';

const failures = [];

function check(name, condition, detail = '') {
    if (condition) {
        console.log(`[OK] ${name}`);
    } else {
        console.log(`[NG] ${name} ${JSON.stringify(detail)}`);
        failures.push(name);
    }
}

// --- computeHourChange: 24:00を0に丸めない ---
check('hour: 23から+1で24になる', JSON.stringify(computeHourChange(0, 24)) === JSON.stringify({ h: 24, m: 0 }), computeHourChange(0, 24));
check('hour: 24タップで24:00を維持する(00:00に丸めない)', computeHourChange(30, 24).h === 24, computeHourChange(30, 24));
check('hour: 24到達時は分を0に固定する', computeHourChange(45, 24).m === 0, computeHourChange(45, 24));
check('hour: 25を指定してもmaxHourでクランプされる', computeHourChange(0, 25).h === MAX_TIME_PICKER_HOUR, computeHourChange(0, 25));
check('hour: 負数を指定しても0でクランプされる', computeHourChange(0, -1).h === 0, computeHourChange(0, -1));

// --- computeMinuteChange ---
check('minute: 24:00の分は変更できない(常に0)', JSON.stringify(computeMinuteChange(24, 30)) === JSON.stringify({ h: 24, m: 0 }), computeMinuteChange(24, 30));
check('minute: 60以上は繰り上がる', JSON.stringify(computeMinuteChange(10, 60)) === JSON.stringify({ h: 11, m: 0 }), computeMinuteChange(10, 60));
check('minute: 繰り上がりで24時に達したら分を0固定', JSON.stringify(computeMinuteChange(23, 90)) === JSON.stringify({ h: 24, m: 0 }), computeMinuteChange(23, 90));
check('minute: 負数は繰り下がる', JSON.stringify(computeMinuteChange(10, -10)) === JSON.stringify({ h: 9, m: 50 }), computeMinuteChange(10, -10));

// --- formatTime ---
check('format: 9:5 -> "09:05"', formatTime(9, 5) === '09:05', formatTime(9, 5));
check('format: 24:0 -> "24:00"', formatTime(24, 0) === '24:00', formatTime(24, 0));

// --- isValidSpecialHours ---
check('valid: 0は有効', isValidSpecialHours('0') === true);
check('valid: 24は有効', isValidSpecialHours('24') === true);
check('valid: 8.5は有効', isValidSpecialHours('8.5') === true);
check('invalid: 25は無効', isValidSpecialHours('25') === false);
check('invalid: 負数は無効', isValidSpecialHours('-1') === false);
check('invalid: 非数値は無効', isValidSpecialHours('abc') === false);
check('invalid: 空文字は無効', isValidSpecialHours('') === false);
// P4 Take4 P2指摘: parseFloatは"8abc"を8として受理してしまうため、厳密な数値変換に置き換えた
check('invalid: 末尾に文字が付く"8abc"は無効(parseFloatの緩さを再発させない)', isValidSpecialHours('8abc') === false);
check('valid: parseStrictNumberは通常の数値を数値として返す', parseStrictNumber('12.5') === 12.5);
check('invalid: parseStrictNumberは"8abc"に対してNaNを返す', Number.isNaN(parseStrictNumber('8abc')));
check('invalid: parseStrictNumberは前後空白のみ許容し中身は厳密("1 2")はNaN', Number.isNaN(parseStrictNumber('1 2')));

// --- parseFourDigitTime: TimePicker中央表示への4桁直接入力 (Cycle2 Take2) ---
check('4桁: "0930"は09:30になる', JSON.stringify(parseFourDigitTime('0930')) === JSON.stringify({ h: 9, m: 30 }), parseFourDigitTime('0930'));
check('4桁: "1500"は15:00になる', JSON.stringify(parseFourDigitTime('1500')) === JSON.stringify({ h: 15, m: 0 }), parseFourDigitTime('1500'));
check('4桁: "2400"は24:00になる(24を0に丸めない)', JSON.stringify(parseFourDigitTime('2400')) === JSON.stringify({ h: 24, m: 0 }), parseFourDigitTime('2400'));
check('4桁: "2430"は不正な24時台として無効(null)', parseFourDigitTime('2430') === null, parseFourDigitTime('2430'));
check('4桁: 分が60以上("0960")は無効(null)', parseFourDigitTime('0960') === null, parseFourDigitTime('0960'));
check('4桁: 時が範囲外("9999")は無効(null)', parseFourDigitTime('9999') === null, parseFourDigitTime('9999'));
check('3桁: "930"は09:30として解釈される(時1桁+分2桁)', JSON.stringify(parseFourDigitTime('930')) === JSON.stringify({ h: 9, m: 30 }), parseFourDigitTime('930'));
check('1〜2桁: "9"は09:00(時のみ、分は0)', JSON.stringify(parseFourDigitTime('9')) === JSON.stringify({ h: 9, m: 0 }), parseFourDigitTime('9'));
check('1〜2桁: "15"は15:00(時のみ、分は0)', JSON.stringify(parseFourDigitTime('15')) === JSON.stringify({ h: 15, m: 0 }), parseFourDigitTime('15'));
check('空文字は無効(null) -> 呼び出し側は編集前の値へ戻す', parseFourDigitTime('') === null);
check('数字以外混入("09:30")は数字部分のみ抽出して解釈される', JSON.stringify(parseFourDigitTime('09:30')) === JSON.stringify({ h: 9, m: 30 }), parseFourDigitTime('09:30'));

console.log();
if (failures.length > 0) {
    console.log(`FAILED: ${failures.length} check(s) failed -> ${JSON.stringify(failures)}`);
    process.exit(1);
} else {
    console.log('ALL TIME UTILS REGRESSION TESTS PASSED');
}
