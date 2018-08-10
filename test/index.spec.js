'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');

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
});
