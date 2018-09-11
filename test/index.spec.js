'use strict';

const chai = require('chai'); // eslint-disable-line node/no-unpublished-require
const chaiHttp = require('chai-http'); // eslint-disable-line node/no-unpublished-require

chai.use(chaiHttp);

describe('Web Server Test Cases', function() {
	const expect = chai.expect;
	it('Should return the index file for the default template for the www tenant', function(done) {
		chai.request('http://localhost:9100')
			.get('/')
			.end((err, response) => {
				expect(response).to.have.status(200);
				done(err);
			});
	});

	it('Should return the favicon for the www tenant', function(done) {
		chai.request('http://localhost:9100')
			.get('/favicon.ico')
			.end((err, response) => {
				expect(response).to.have.status(200);
				done(err);
			});
	});

	it('Should return the favicon for the www tenant after reconfiguration of the WebserverService', function(done) {
		const fs = require('fs');
		const path = require('path');

		const webserverConfigPath = path.join(path.dirname(__dirname), `config/test/server/services/webserver_service.js`);
		let webserverConfig = require(webserverConfigPath).config; //eslint-disable-line

		webserverConfig.logLevel = (webserverConfig.logLevel === 'debug') ? 'silly' : 'debug';
		webserverConfig = `exports.config = ${JSON.stringify(webserverConfig, null, '\t')};`;

		fs.writeFileSync(webserverConfigPath, webserverConfig); //eslint-disable-line

		snooze(2000)
		.then(() => {
			chai.request('http://localhost:9100')
			.get('/favicon.ico')
			.end((err, response) => {
				expect(response).to.have.status(200);
				done(err);
			});
		});
	});
});
