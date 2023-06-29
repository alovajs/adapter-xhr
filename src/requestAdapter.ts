import { ProgressUpdater } from 'alova';
import { AlovaXHRAdapter, AlovaXHRResponse } from '../typings';
import {
	data2QueryString,
	err,
	falseValue,
	isPlainObject,
	isSpecialRequestBody,
	isString,
	noop,
	nullValue,
	parseResponseHeaders,
	trueValue
} from './helper';

const isBodyData = (data: any): data is XMLHttpRequestBodyInit => isString(data) || isSpecialRequestBody(data);
/**
 * XMLHttpRequest请求适配器
 */
export default function requestAdapter() {
	const adapter: AlovaXHRAdapter = ({ type, url, data = null, headers }, method) => {
		const { config } = method;
		const { auth, withCredentials, mimeType } = config;
		let downloadHandler: ProgressUpdater = noop;
		let uploadHandler: ProgressUpdater = noop;

		let xhr: XMLHttpRequest;
		const responsePromise = new Promise<AlovaXHRResponse>((resolve, reject) => {
			try {
				xhr = new XMLHttpRequest();
				xhr.open(type, url, trueValue, auth?.username, auth?.password);
				xhr.responseType = config.responseType || 'json';
				xhr.timeout = config.timeout || 0;

				if (withCredentials === trueValue) {
					xhr.withCredentials = withCredentials;
				}

				// 设置mimeType
				if (mimeType) {
					xhr.overrideMimeType(mimeType);
				}

				// 设置请求头
				let isContentTypeSet = falseValue;
				let isContentTypeFormUrlEncoded = falseValue;
				Object.keys(headers).forEach(headerName => {
					if (/content-type/i.test(headerName)) {
						isContentTypeSet = trueValue;
						isContentTypeFormUrlEncoded = /application\/x-www-form-urlencoded/i.test(headers[headerName]);
					}
					xhr.setRequestHeader(headerName, headers[headerName]);
				});

				// Content-Type在未指定时默认使用application/json; charset=UTF-8
				if (!isContentTypeSet && (data ? data.toString() !== '[object FormData]' : true)) {
					xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
				}

				// 如果启用了下载进度，则监听下载事件
				if (config.enableDownload) {
					xhr.onprogress = event => {
						downloadHandler(event.loaded, event.total);
					};
				}

				// 如果启用了上传进度，则监听上传事件
				if (config.enableUpload) {
					xhr.upload.onprogress = event => {
						uploadHandler(event.loaded, event.total);
					};
				}

				// 请求成功事件
				xhr.onload = () => {
					resolve({
						status: xhr.status,
						statusText: xhr.statusText,
						data: xhr.response,
						headers: parseResponseHeaders(xhr.getAllResponseHeaders())
					});
				};

				// 请求错误事件
				xhr.onerror = () => {
					reject(err('Network Error'));
				};
				// 请求超时事件
				xhr.ontimeout = () => {
					reject(err('Network Timeout'));
				};
				// 中断事件
				xhr.onabort = () => {
					reject(err('The user aborted a request'));
				};

				// 如果请求头中的Content-Type是application/x-www-form-urlencoded时，将body数据转换为queryString
				let dataSend: any = data;
				if (isContentTypeFormUrlEncoded && isPlainObject(dataSend)) {
					dataSend = data2QueryString(dataSend);
				}
				// GET请求时为null，此时不需要进入处理
				if (dataSend !== nullValue) {
					dataSend = isBodyData(dataSend) ? dataSend : JSON.stringify(dataSend);
				}
				xhr.send(dataSend);
			} catch (error) {
				reject(error);
			}
		});

		return {
			response: () => responsePromise,
			headers: () => responsePromise.then(res => res.headers),
			abort: () => {
				xhr.abort();
			},
			onDownload: handler => {
				downloadHandler = handler;
			},
			onUpload: handler => {
				uploadHandler = handler;
			}
		};
	};
	return adapter;
}
