import { createAlova, useRequest } from 'alova';
import VueHook from 'alova/vue';
import { readFileSync } from 'fs';
import path from 'path';
import { xhrRequestAdapter } from '../src/index';
import { AlovaXHRResponse } from '../typings';
import { mockServer } from './mockServer/server';
import { Result } from './result.type';
import { mockBaseURL, untilCbCalled } from './utils';

beforeAll(() => mockServer.listen());
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());
describe('request adapter', () => {
	test('should send request by XMLHttpRequest', async () => {
		const alovaInst = createAlova({
			baseURL: mockBaseURL,
			requestAdapter: xhrRequestAdapter(),
			statesHook: VueHook,
			timeout: 100000,
			responsed(response) {
				const { status, statusText, data } = response;
				expect(status).toBe(200);
				expect(statusText).toBe('OK');
				return data;
			}
		});

		const Get = alovaInst.Get<Result>('/unit-test', {
			params: {
				a: '1',
				b: '2'
			}
		});

		const { loading, data, downloading, error, onSuccess } = useRequest(Get);
		expect(loading.value).toBeTruthy();
		expect(data.value).toBeUndefined();
		expect(downloading.value).toEqual({ total: 0, loaded: 0 });
		expect(error.value).toBeUndefined();

		await untilCbCalled(onSuccess);
		expect(loading.value).toBeFalsy();
		expect(data.value.code).toBe(200);
		expect(data.value.data.method).toBe('GET');
		expect(data.value.data.params).toStrictEqual({
			a: '1',
			b: '2'
		});
		expect(data.value.data.path).toBe('/unit-test');
		expect(downloading.value).toEqual({ total: 0, loaded: 0 });
		expect(error.value).toBeUndefined();
	});

	test('should send post requset without `content-type`', async () => {
		const alovaInst = createAlova({
			baseURL: mockBaseURL,
			requestAdapter: xhrRequestAdapter(),
			statesHook: VueHook,
			responsed({ data }) {
				return data;
			}
		});

		const Post = alovaInst.Post<Result<true>>(
			'/unit-test',
			{ post1: 'p1', post2: 'p2' },
			{
				params: {
					a: '1',
					b: '2'
				},
				auth: {
					username: 'name1',
					password: '123456'
				}
			}
		);

		const { loading, data, onSuccess } = useRequest(Post);
		await untilCbCalled(onSuccess);
		expect(loading.value).toBeFalsy();

		const dataObj = data.value;
		expect(dataObj.code).toBe(200);
		expect(dataObj.data.method).toBe('POST');
		expect(dataObj.data.data).toStrictEqual({
			post1: 'p1',
			post2: 'p2'
		});
		expect(dataObj.data.path).toBe('/unit-test');
	});

	test('should throw error when set wrong param', async () => {
		const alovaInst = createAlova({
			baseURL: mockBaseURL,
			requestAdapter: xhrRequestAdapter(),
			statesHook: VueHook
		});

		Object.defineProperty(XMLHttpRequest.prototype, 'timeout', {
			configurable: true,
			set() {
				throw new Error('mock timeout set error');
			}
		});

		const Get = alovaInst.Get<Result<true>>('/unit-test', {
			params: {
				a: '1',
				b: '2'
			}
		});
		await expect(() => Get.send()).rejects.toThrow('mock timeout set error');
		delete (XMLHttpRequest.prototype as any).timeout;
	});

	test('should send post requset with `content-type=application/x-www-form-urlencoded`', async () => {
		const alovaInst = createAlova({
			baseURL: mockBaseURL,
			requestAdapter: xhrRequestAdapter(),
			statesHook: VueHook,
			responsed({ data }) {
				return data;
			}
		});

		const Post = (data: any) =>
			alovaInst.Post<Result<true>>('/unit-test', data, {
				params: {
					a: '1',
					b: '2'
				},
				headers: {
					'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
				},
				mimeType: 'text/plain; charset=x-user-defined'
			});

		const { loading, data, onSuccess } = useRequest(Post({ post1: 'p1', post2: 'p2' }));
		await untilCbCalled(onSuccess);
		expect(loading.value).toBeFalsy();

		const dataObj = data.value;
		expect(dataObj.code).toBe(200);
		expect(dataObj.data.method).toBe('POST');
		expect(dataObj.data.data).toBe('post1=p1&post2=p2');
		expect(dataObj.data.path).toBe('/unit-test');

		// 再次测试提交复杂层级数据
		const dataRaw = await Post({
			a: null,
			b: [2, 3],
			c: {
				d: [
					55,
					{
						e: 78,
						ddddd: [
							{ g: 889 },
							900,
							[
								{
									oo: 23,
									op: [99, 62]
								}
							]
						]
					}
				]
			},
			h: undefined
		}).send();
		expect(dataRaw.code).toBe(200);
		expect(dataRaw.data.method).toBe('POST');
		expect(dataObj.data.path).toBe('/unit-test');
		expect(dataRaw.data.data).toBe(
			[
				'a=null',
				'b[0]=2',
				'b[1]=3',
				'c[d][0]=55',
				'c[d][1][e]=78',
				'c[d][1][ddddd][0][g]=889',
				'c[d][1][ddddd][0][1]=900',
				'c[d][1][ddddd][0][2][0][oo]=23',
				'c[d][1][ddddd][0][2][0][op][0]=99',
				'c[d][1][ddddd][0][2][0][op][1]=62'
			].join('&')
		);
	});

	test('api not found when request', async () => {
		const alovaInst = createAlova({
			baseURL: mockBaseURL,
			requestAdapter: xhrRequestAdapter(),
			statesHook: VueHook
		});

		const Get = alovaInst.Get<AlovaXHRResponse<Result>>('/unit-test-404');
		const { loading, data, downloading, error, onSuccess } = useRequest(Get);
		expect(loading.value).toBeTruthy();
		expect(data.value).toBeUndefined();
		expect(downloading.value).toEqual({ total: 0, loaded: 0 });
		expect(error.value).toBeUndefined();

		await untilCbCalled(onSuccess);
		expect(loading.value).toBeFalsy();
		expect(data.value.data).toBeNull();
		expect(data.value.status).toBe(404);
		expect(data.value.statusText).toBe('api not found');
	});

	test('request fail', async () => {
		const alovaInst = createAlova({
			baseURL: mockBaseURL,
			requestAdapter: xhrRequestAdapter(),
			statesHook: VueHook,
			responsed({ data }) {
				return data;
			}
		});

		const Get = alovaInst.Get<Result>('/unit-test-error');
		const { loading, data, downloading, error, onError } = useRequest(Get);
		expect(loading.value).toBeTruthy();
		expect(data.value).toBeUndefined();
		expect(downloading.value).toEqual({ total: 0, loaded: 0 });
		expect(error.value).toBeUndefined();

		const { error: errRaw } = await untilCbCalled(onError);
		expect(loading.value).toBeFalsy();
		expect(data.value).toBeUndefined();
		expect(error.value).toBe(errRaw);
		expect(error.value?.message).toMatch(/Network Error/);
	});

	// 好像msw配合xhr的timeout不会触发ontimeout，暂时先skip
	test.skip('should cancel request when timeout', async () => {
		const alovaInst = createAlova({
			baseURL: mockBaseURL,
			requestAdapter: xhrRequestAdapter(),
			statesHook: VueHook,
			timeout: 1,
			responsed({ data }) {
				return data;
			}
		});

		const Get = alovaInst.Get<Result>('/unit-test-10s');
		const { loading, data, downloading, error, onError } = useRequest(Get);
		expect(loading.value).toBeTruthy();
		expect(data.value).toBeUndefined();
		expect(downloading.value).toEqual({ total: 0, loaded: 0 });
		expect(error.value).toBeUndefined();

		await untilCbCalled(onError);
		expect(loading.value).toBeFalsy();
		expect(data.value).toBeUndefined();
		expect(downloading.value).toEqual({ total: 0, loaded: 0 });
		expect(error.value?.message).toBe('canceled');
	});

	test('should cancel request when call `abort`', async () => {
		const alovaInst = createAlova({
			baseURL: mockBaseURL,
			requestAdapter: xhrRequestAdapter(),
			statesHook: VueHook,
			responsed({ data }) {
				return data;
			}
		});

		const Get = alovaInst.Get<Result>('/unit-test');
		const { loading, data, downloading, error, abort, onError } = useRequest(Get);
		expect(loading.value).toBeTruthy();
		expect(data.value).toBeUndefined();
		expect(downloading.value).toEqual({ total: 0, loaded: 0 });
		expect(error.value).toBeUndefined();

		abort();
		await untilCbCalled(onError);
		expect(loading.value).toBeFalsy();
		expect(data.value).toBeUndefined();
		expect(downloading.value).toEqual({ total: 0, loaded: 0 });
		expect(error.value?.message).toBe('The user aborted a request');
	});

	test('should upload file and pass the right args', async () => {
		const alovaInst = createAlova({
			baseURL: mockBaseURL,
			requestAdapter: xhrRequestAdapter(),
			statesHook: VueHook,
			responsed({ data }) {
				return data;
			}
		});

		// 使用formData上传文件
		const formData = new FormData();
		formData.append('f1', 'f1');
		formData.append('f2', 'f2');
		const imageFile = new File([readFileSync(path.resolve(__dirname, './image.jpg'))], 'file', {
			type: 'image/jpeg'
		});
		formData.append('file', imageFile);
		const Post = alovaInst.Post<Result<string>>('/unit-test', formData, {
			withCredentials: true,
			// jsdom的xhr.upload不支持上传功能，因此即使设置为true了也无法获取上传进度
			enableUpload: true
		});

		const { loading, data, uploading, downloading, error, onSuccess } = useRequest(Post);
		await untilCbCalled(onSuccess);
		expect(loading.value).toBeFalsy();
		expect(data.value.code).toBe(200);
		expect(data.value.data.method).toBe('POST');
		expect(data.value.data.path).toBe('/unit-test');
		expect(uploading.value).toEqual({ total: 0, loaded: 0 });
		expect(downloading.value).toEqual({ total: 0, loaded: 0 });
		expect(error.value).toBeUndefined();
	});

	test('should download file and pass the right args', async () => {
		const alovaInst = createAlova({
			baseURL: mockBaseURL,
			requestAdapter: xhrRequestAdapter(),
			statesHook: VueHook,
			responsed({ data }) {
				return data;
			}
		});

		const Get = alovaInst.Get('/unit-test-download', {
			enableDownload: true,
			responseType: 'blob'
		});

		const { loading, data, uploading, downloading, error, onSuccess } = useRequest(Get);
		await untilCbCalled(onSuccess);
		expect(loading.value).toBeFalsy();
		expect(data.value).toBeInstanceOf(Blob);
		expect(uploading.value).toEqual({ total: 0, loaded: 0 });
		expect(downloading.value).toEqual({ total: 3273178, loaded: 3273178 });
		expect(error.value).toBeUndefined();
	});
});
