/*global exports, require */
(function() {
	"use strict";
	
	var process = require('builtin/process');
	process.setenv('LD_LIBRARY_PATH', '/opt/instantclient');

	exports.extend({
		driver: require('./lib/oracle_module'),
		Oracle: require('./lib/Oracle').Oracle,
		Schema: require('./lib/Schema').Schema
	});
}());
