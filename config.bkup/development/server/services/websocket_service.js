exports.config = {
	"primus": {
		"parser": "JSON",
		"pathname": "/websockets",
		"transformer": "websockets",
		"iknowclusterwillbreakconnections": false
	},
	"session": {
		"key": "twyr-webapp",
		"ttl": 3600,
		"store": {
			"media": "redis",
			"prefix": "twyr!webapp!session!"
		},
		"secret": "Th1s!sTheTwyrWebAppFramew0rk"
	},
	"cookieParser": {
		"path": "/",
		"domain": ".twyr.com",
		"maxAge": 1814172241670,
		"secure": false,
		"httpOnly": false
	},
	"subdomainMappings": {
		"cloud-portal": "www",
		"local-portal": "www"
	}
};
