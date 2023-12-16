import { parseResponseHeaders } from '../src/helper';

describe('parseResponseHeaders tests', () => {
	test('mvp test', () => {
		const header = parseResponseHeaders('x-powered-by: msw');
		expect(Object.keys(header).length).toBe(1);
		expect(header['x-powered-by']).toBe('msw');
	});

	test('empty header', () => {
		const header = parseResponseHeaders('');
		expect(Object.keys(header).length).toBe(0);
	});
});
