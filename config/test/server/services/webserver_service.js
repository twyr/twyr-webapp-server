exports.config = {
	"port": 9100,
	"static": {
		"path": "./../../../static_assets",
		"index": "/",
		"maxAge": 300
	},
	"favicon": "./../../../static_assets/favicon.ico",
	"session": {
		"key": "twyr-webapp",
		"ttl": 86400,
		"store": {
			"media": "redis",
			"prefix": "twyr!webapp!session!"
		},
		"secret": "Th1s!sTheTwyrWebAppFramew0rk"
	},
	"version": "3.0.1",
	"protocol": "http",
	"poweredBy": "Twyr Portal",
	"cookieParser": {
		"path": "/",
		"domain": ".twyr.com",
		"maxAge": 1814172241670,
		"secure": false,
		"httpOnly": false
	},
	"maxRequestSize": 5242880,
	"requestTimeout": 120,
	"templateEngine": "ejs",
	"secureProtocols": {
		"https": {
			"key": "./ssl/server.key",
			"cert": "./ssl/server.crt",
			"rejectUnauthorized": true
		},
		"spdy": {
			"key": "./ssl/server.key",
			"cert": "./ssl/server.crt",
			"rejectUnauthorized": true
		},
		"http2": {
			"key": "./ssl/server.key",
			"cert": "./ssl/server.crt",
			"allowHTTP1": true,
			"settings": {
				"enablePush": true
			}
		}
	},
	"connectionTimeout": 120,
	"subdomainMappings": {
		"cloud-portal": "www",
		"local-portal": "www",
		"localhost": "www",
		"127.0.0.1": "www"
	},
	"corsAllowedDomains": [],
	"requestLogLevel": "debug"
};
