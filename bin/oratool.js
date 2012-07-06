#!/usr/local/bin/silkjs

var ReadLine = require('ReadLine'),
	fs = require('fs'),
	process = require('builtin/process'),
	Oracle = require('Oracle').Oracle,
    console = require('console');

var SQL = new Oracle();

function show(what, arg) {
	what = what.toLowerCase();
	var query;
	switch (what) {
		case 'primarykey':
			console.dir(SQL.getDataRows([
				'SELECT',
				'	A.CONSTRAINT_NAME,COLUMN_NAME',
				'FROM',
				'	ALL_CONS_COLUMNS A JOIN ALL_CONSTRAINTS C',
				'ON',
				'	A.CONSTRAINT_NAME = C.CONSTRAINT_NAME',
				'WHERE',
				'	C.TABLE_NAME = ' + SQL.quote(arg),
				"	AND C.CONSTRAINT_TYPE = 'P'"
			]));
			break;
		case 'tables':
			break;
		case 'sequences':
			break;
		case 'indexes':
			query = 'select index_name, column_name from user_ind_columns WHERE table_name=' + SQL.quote(arg);
			console.dir(query);
			console.dir(SQL.getDataRows(query));
			break;
		default:
			console.log('INVALID COMMAND');
			break;
	}
}

function describe(what) {
	console.dir(SQL.getDataRows('select column_name,data_type,data_length,data_precision from all_tab_columns where table_name = ' + SQL.quote(what)));
}

function ddrop(what) {
	try {
		console.log('DROP TABLE "' + what + '"');
		SQL.update('DROP TABLE "' + what + '"');
	}
	catch (e) {
		console.dir(e);
	}

	// indexes
	SQL.getDataRows('SELECT INDEX_NAME, COLUMN_NAME FROM USER_IND_COLUMNS WHERE TABLE_NAME=' + SQL.quote(what)).each(function(row) {
		console.log('drop index "' + row.INDEX_NAME + '"');
		try {
			SQL.update('drop index "' + row.INDEX_NAME + '"');
		}
		catch (e) {
			console.dir(e);
		}
	});
	// sequences
	SQL.getDataRows('select sequence_name FROM user_sequences').each(function(row) {
		var n = row.SEQUENCE_NAME.replace(/_.*$/, '');
		if (n === what) {
			console.log('DROP SEQUENCE "' + row.SEQUENCE_NAME + '"');
			try {
				SQL.update('DROP SEQUENCE "' + row.SEQUENCE_NAME + '"');
			}
			catch (e) {
				console.dir(e);
			}
		}
	});
}

function main(connectString) {
	if (!connectString && fs.exists('./oratool.config')) {
		var config = require('./oratool.config');
		connectString = config.user + '/' + config.password + '@//' + config.server + ':1521' + '/' + config.db;
	}
	if (!connectString) {
		console.log('Usage:');
		console.log('\toratool.js username/password@//server[:port]/database');
		process.exit(0);
	}
	var parts = connectString.split('@');
	var up = parts[0].split('/');
	var username = up[0],
		password = up[1];
	
	var sd = parts[1].substr(2).split('/');
	var port = 1521,
		host = sd[0],
		db = sd[1];
	if (host.indexOf(':') !== -1) {
		var hp = host.split(':');
		host = hp[0];
		port = hp[1];
	}

	global.Config = {
		oracle: {
			host: host,
			port: port,
			user: username,
			passwd: password,
			db: db
		}
	};
	SQL.connect();
	var stdin = new ReadLine('oratool');
	stdin.prompt('oratool> ');
	while (1) {
		var query;
		try {
			query = stdin.gets();
		}
		catch (e) {
			if (e === 'SIGQUIT' || e === 'SIGTERM') {
				break;
			}
			console.dir(e);
		}
		try {
			query = query.replace(/;$/, '');
			var parts = query.split(' ');
			var cmd = parts[0].toLowerCase();
			switch (cmd) {
				case 'ddrop':
					ddrop(parts[1]);
					break;
				case 'describe':
					describe(parts[1]);
					break;
				case 'show':
					show(parts[1], parts[2]);
					break;
				case 'select':
				case 'desc':
				case 'describe':
					console.dir(SQL.getDataRows(query));
					break;
				case 'start':
					console.dir(SQL.startTransaction());
					break;
				case 'commit':
					console.dir(SQL.commit());
					break;
				case 'rollback':
					console.dir(SQL.rollback());
					break;
				default:
					console.dir(SQL.update(query));
					break;
			}
		}
		catch (e) {
			console.dir(e);
		}
	}
}
