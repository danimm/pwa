const webpack = require('webpack');
const { resolve } = require('path');
const rr = require('require-relative');
const toWebpack = require('./config');
const $ = require('../utils');

module.exports = function (src, opts) {
	let cwd = opts.cwd = resolve(opts.cwd || '.');
	opts.production = !!opts.production;
	delete opts._; // useless

	// Load default configs
	let config = require('../config');
	let tmp, customs=[], handlers=[];

	// Parse any "@pwa/preset"s from local "package.json"
	if (tmp = $.load(cwd, 'package.json')) {
		let m, devs=Object.keys(tmp.devDependencies || {});
		devs.filter(x => x.indexOf('@pwa/preset') == 0).forEach(str => {
			console.log('[PWA] Applying preset :: `%s`', str);
			m = require(rr.resolve(str, cwd)); // allow throw
			customs.push(m);
		});
	}

	// Determine if custom config exists (always last)
	if (tmp = $.load(cwd, 'pwa.config.js')) {
		console.log('[PWA] Loading custom config');
		customs.push(tmp);
	}

	// Mutate config w/ custom values
	// ~> defer webpack-related changes for later
	customs.forEach(mix => {
		if (typeof mix === 'function') {
			handlers.push(mix); // is webpack only
		} else {
			$.merge(config, mix); //~> mutate
			mix.webpack && handlers.push(mix.webpack);
		}
	});

	// use root if "/src" is missing
	src = resolve(cwd, src || 'src');
	src = $.isDir(src) ? src : cwd;

	// Build Webpack's Config for 1st time
	let wconfig = toWebpack(src, config, opts);

	// Apply presets' & custom webpack changes
	handlers.forEach(fn => fn(wconfig, opts));

	if (opts.production && opts.analyze) {
		let { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
		wconfig.plugins.push( new BundleAnalyzerPlugin() );
	}

	if (opts.export) {
		// wconfig.push Prerender anywhere
	}

	return webpack(wconfig);
}