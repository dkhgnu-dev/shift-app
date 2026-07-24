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

console.log();
if (failures.length > 0) {
    console.log(`FAILED: ${failures.length} check(s) failed -> ${JSON.stringify(failures)}`);
    process.exit(1);
} else {
    console.log('ALL TIME UTILS REGRESSION TESTS PASSED');
}
