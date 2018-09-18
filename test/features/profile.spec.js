'use strict';

const chai = require('chai'); // eslint-disable-line node/no-unpublished-require
const chaiHttp = require('chai-http'); // eslint-disable-line node/no-unpublished-require

chai.use(chaiHttp);

describe('Profile Feature Test Cases', function() {
	const agent = chai.request.agent('http://localhost:9100');
	const expect = chai.expect;

	chai.should();

	it('Should not return the User details if not logged in', function(done) {
		agent
			.get('/profile')
			.end((err, response) => {
				expect(response).to.have.status(422);
				done(err);
			});
	});
});
