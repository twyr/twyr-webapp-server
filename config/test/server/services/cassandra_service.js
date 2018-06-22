exports.config = {
	"pooling": {
		"coreConnectionsPerHost": {
			"local": 2,
			"remote": 1
		}
	},
	"contactPoints": ['127.0.0.1', 'localhost'],
	"keyspace": "twyr"
};
