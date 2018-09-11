'use strict';

const chai = require('chai'); // eslint-disable-line node/no-unpublished-require
const chaiHttp = require('chai-http'); // eslint-disable-line node/no-unpublished-require

chai.use(chaiHttp);

describe('Web Server Test Cases', function() {
	it('Should return the index file for the default template for the www tenant', function(done) {
		const expect = chai.expect;

		chai.request('http://localhost:9100')
			.get('/')
			.end((err, response) => {
				expect(response).to.have.status(200);
				done(err);
			});
	});

	it('Should return the favicon for the www tenant', function(done) {
		const expect = chai.expect;

		chai.request('http://localhost:9100')
			.get('/favicon.ico')
			.end((err, response) => {
				expect(response).to.have.status(200);
				done(err);
			});
	});
});
