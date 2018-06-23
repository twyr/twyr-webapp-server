exports.config = {
	"File": {
		"json": false,
		"name": "File",
		"level": "warn",
		"maxsize": 10485760,
		"colorize": false,
		"filename": "logs/twyr-web-application.log",
		"maxFiles": 10,
		"tailable": true,
		"timestamp": true,
		"prettyPrint": true,
		"zippedArchive": true,
		"handleExceptions": true,
		"humanReadableUnhandledException": true
	},
	"Console": {
		"json": false,
		"name": "Console",
		"level": "warn",
		"colorize": true,
		"timestamp": true,
		"prettyPrint": true,
		"handleExceptions": true,
		"humanReadableUnhandledException": true
	}
};
