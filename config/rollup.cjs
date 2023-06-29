/*
 * @Date: 2020-04-09 11:06:01
 * @LastEditors: JOU(wx: huzhen555)
 * @LastEditTime: 2022-11-30 21:15:34
 */
const typescript = require('rollup-plugin-typescript2');
const pkg = require('../package.json');
const version = process.env.VERSION || pkg.version;
const author = pkg.author;
const repository = pkg.repository.url.replace('git', 'https').replace('.git', '');

const getCompiler = (
	opt = {
		// objectHashIgnoreUnknownHack: true,
		// clean: true,
		tsconfigOverride: {
			compilerOptions: {
				module: 'ES2015'
			}
		}
	}
) => typescript(opt);
exports.getCompiler = getCompiler;
exports.banner = `/**
  * ${pkg.name} ${version} (${pkg.homepage})
  * Copyright ${new Date().getFullYear()} ${author}. All Rights Reserved
  * Licensed under MIT (${repository}/blob/master/LICENSE)
  */
`;

const compilePath = (exports.compilePath = {
	external: ['alova'],
	packageName: 'AlovaAdapterXhr',
	input: 'src/index.ts',
	output: suffix => `dist/alova-adapter-xhr.${suffix}.js`
});
exports.external = compilePath.external;
