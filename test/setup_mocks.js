/**
 * @file      test/setup_mocks.js
 * @author    Vish Desai <shadyvd@hotmail.com>
 * @version   3.0.1
 * @copyright Copyright&copy; 2014 - 2018 {@link https://twyr.github.io|Twyr}
 * @license   {@link https://spdx.org/licenses/Unlicense.html|Unlicense}
 * @summary   Mocking up required API before running any tests
 *
 */

'use strict';

const _setupFn = function(callback) {
	if(callback) callback();
};

const _teardownFn = function(callback) {
	if(callback) callback();
};

const prepare = require('mocha-prepare');
prepare(_setupFn, _teardownFn);
