exports.config = {
	"domain": "twyr.com",
	"protocol": "http",
	"port": 9100,
	"version": "3.0.1",
	"poweredBy": "Twyr Portal",
	"connectionTimeout": 120,
	"logLevel": "silly",
	"honeyPot": {
		"apiKey": "YOUR_API_KEY"
	},
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
	"session": {
		"keys": [
			"Th1s!sTheTwyrWebAppFramew0rk"
		],
		"config": {
			"key": "twyr!webapp!server",
			"maxAge": 86400000,
			"overwrite": true,
			"httpOnly": false,
			"signed": true,
			"rolling": false,
			"renew": false
		}
	},
	"subdomainMappings": {
		"cloud-portal": "www",
		"local-portal": "www",
		"localhost": "www",
		"127.0.0.1": "www"
	}
};
