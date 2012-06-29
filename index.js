/*global exports, require */
(function() {
	"use strict";
	exports.extend({
		driver: require('./lib/oracle_module'),
		Oracle: require('./lib/Oracle').MySQL,
		Schema: require('./lib/Schema').Schema
	});
}());
