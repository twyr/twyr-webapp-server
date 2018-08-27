'use strict';

/* eslint-disable security/detect-non-literal-require */

const path = require('path');

// INFO: THIS IS ABSOLUTELY CRITICAL - Needs to be done!!
require.main.filename = path.join(__dirname, '../server/index.js');

require('app-module-path').addPath(`${path.dirname(__dirname)}/framework`);
require('dotenv').config();

global.twyrEnv = (process.env.NODE_ENV || 'development').toLocaleLowerCase();
process.title = 'twyr-webapp';

global.snooze = async (ms) => {
	const Promise = require('bluebird');
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
};

const SERVER_NAME = process.env.SERVER_NAME || 'TwyrWebappServer';
const TwyrApplication = require(path.join(path.dirname(__dirname), 'server/twyr-application-class')).TwyrApplication;

const serverInstance = new TwyrApplication(SERVER_NAME);

const _setupFn = function(callback) {
	serverInstance.once('server-online', () => {
		setTimeout(callback, 5000);
	});

	serverInstance.bootupServer()
	.catch((bootupErr) => {
		if(callback) callback(bootupErr);
	});
};

const _teardownFn = function(callback) {
	serverInstance.shutdownServer()
	.then(() => {
		if(callback) callback();
	})
	.catch((shutdownErr) => {
		if(callback) callback(shutdownErr);
	});
};

const prepare = require('mocha-prepare'); // eslint-disable-line node/no-unpublished-require
prepare(_setupFn, _teardownFn);
