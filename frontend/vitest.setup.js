import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// 各テスト後にDOMを片付ける(TimePicker.test.jsxで毎回render()するため必須)。
afterEach(cleanup);
