/**
 * @class Oracle
 *
 * ### Synopsis
 *
 * Oracle interface built on top of the C++ Oracle driver.
 *
 * ### Description
 *
 * General purpose Oracle interface.  The Schema ORM is built on top of this interface.
 *
 * ### Usage
 *
 * var Oracle = require('Oracle').Oracle;
 *
 * ### Notes
 *
 * Throughout this documentation, an SQL variable that is an instantiated Oracle object is referred to.  This is the "vision" for how to use this class.
 *
 * Most of these methods can throw an SQLException.  A malformed query (syntax error) will certainly generate one.  You likely will try/catch around calls to these methods, as shown in the example below.
 *
 * ### Example
 *
 * ```
 * var SQL = new Oracle();
 * SQL.connect();   // uses Config.mysql settings for connection
 * SQL.startTransaction();
 * try {
 *    SQL.update('INSERT INTO table1 VALUES (' + SQL.quote(val1) + ',' + SQL.quote(val2) + ')');
 *    SQL.update('INSERT INTO table2 VALUES (' + SQL.quote(val3) + ',' + SQL.quote(val4) + ')');
 *    SQL.commit();
 * }
 * catch (e) {
 *   console.log('SQL Error: ' + e.query + '\n' + e.message);
 *   SQL.rollback();
 * }
 * ```
 */

/*global require, exports, toString, Config, SQLException */
(function() {
    "use strict";

    var oracle = require('./oracle_module');

    function isArray(v) {
        return toString.apply(v) === '[object Array]';
    }

    function addslashes(str) {
        return (str + '').replace(/([\\"'])/g, "\\$1").replace(/\0/g, "\\0");
    }

    /**
     * @constructor Oracle
     *
     * ### Synopsis
     *
     * var SQL = new Oracle();
     *
     * Oracle class constructor.
     *
     * ### Description
     *
     * The Oracle class represents a connection to a Oracle server and database.
     *
     * You may create multiple Oracle instances connected to different servers and/or databases.
     *
     * ### Example
     *
     * ```
     * var SQL = new Oracle();
     * SQL.connect(host, user, password, db);
     * console.dir(SQL.getDataRows('SELECT * FROM table'));
     * ```
     *
     */
    var Oracle = function() {
        this.queryCount = 0;
        this.handle = null;
		this.transactionId = 0;
		this.transactionStack = [];
    };

    Oracle.prototype.extend({
        /**
         * @function SQL.connect
         *
         * ### Synopsis
         *
         * SQL.connect(host, user, passwd, db);
         * or
         * SQL.connect();
         *
         * Connect an SQL instance to a server and database.
         *
         * The second form for SQL.connect, with no arguments, means a global Config.oracle object is expected with host, user, passwd, and db members that specify the connection parameeters.
         *
         * @param {string} host - host name of Oracle server.
         * @param {string} user - Oracle username.
         * @param {string} passwd - Oracle password for the given user;
         * @param {string} db - name of database to use.
         */
        connect: function(host, user, passwd, db, port) {
            if (!this.handle) {
                host = host || Config.oracle.host;
                user = user || Config.oracle.user;
				port = port || Config.oracle.port;
				port = port || 1521;
                passwd = passwd !== undefined ? passwd : Config.oracle.passwd;
                db = db || Config.oracle.db;
				db = host + ':' + port + '/' + db;
                this.handle = oracle.connect(host, user, passwd, db);
            }
        },

        /**
         * @function SQL.getDataRows
         *
         * ### Synopsis
         *
         * var rows = SQL.getDataRows(query);
         *
         * Query the database for an array of rows.
         *
         * ### Description
         *
         * An array of rows is returned if the query succeeds and there are one or more rows matching the query.
         *
         * Each row in the array is an object/hash, with key/value pairs.  The key is the column name in the table, the value is the value from the column for the selected row.
         *
         * The query may be a string or an array.  If it is an array, this function will join that array with newline.  See examples below.
         *
         * @param {string|array} query - the query to perform (a SELECT)
         * @returns {array|false} rows - array (possibly empty) of result set, or false if error.
         *
         * ### Examples
         *
         * _Query as string_
         * ```
         * console.dir(SQL.getDataRows('SELECT * FROM table'));
         * ```
         *
         * _Query as array_
         * ```
         * console.dir(SQL.getDataRows([
         *      'SELECT',
         *      '   *',
         *      'FROM',
         *      '   table'
         * ]));
         * ```
         */
        getDataRows: function(sql) {
            this.connect();
            sql = isArray(sql) ? sql.join('\n') : sql;
            try {
                return oracle.getDataRows(this.handle, sql);
    //          return eval(oracle.getDataRowsJson(sql).replace(/\n/igm, '\\n'));
            }
            catch (e) {
				log('Exception ' + e);
				log(sql);
                throw new SQLException(this.queryCount + ' ' + e, sql);
            }
            this.queryCount++;
        },

        /**
         * @function SQL.getDataRows
         *
         * ### Synopsis
         *
         * var row = SQL.getDataRow(query);
         *
         * Query the database for a single record.
         *
         * ### Description
         *
         * An object is returned if the query succeeds and there are one or more rows matching the query.
         *
         * The object is a hash with key/value pairs.  The key is the column name in the table, the value is the value from the column for the selected row.
         *
         * The query may be a string or an array.  If it is an array, this function will join that array with newline.  See examples below.
         *
         * @param {string|array} query - the query to perform (a SELECT)
         * @return {object|false} row - object representing the row queried, or false if error.
         *
         * ### Examples
         *
         * _Query as string_
         * ```
         * console.dir(SQL.getDataRow('SELECT * FROM table'));
         * ```
         *
         * _Query as array_
         * ```
         * console.dir(SQL.getDataRow([
         *      'SELECT',
         *      '   *',
         *      'FROM',
         *      '   table'
         * ]));
         * ```
         */
        getDataRow: function(sql) {
            this.connect();
            sql = isArray(sql) ? sql.join('\n') : sql;
            try {
                return oracle.getDataRow(this.handle, sql);
            }
            catch (e) {
                throw new SQLException(e, sql);
            }
        },

        /**
         * @function SQL.getScalar
         *
         * ### Synopsis
         *
         * var value = SQL.getScalar(query);
         *
         * Query the database for a single column value from a single record.
         *
         * ### Description
         *
         * This method is handy for <code>SELECT COUNT(*) FROM table</code> type queries.
         *
         * The query may be a string or an array.  If it is an array, this function will join that array with newline.  See examples below.
         *
         * @param {string|array} query - the query to perform (a SELECT)
         * @return {int|string|false} value - the value of the query, or false if error.
         *
         * ### Examples
         *
         * _Query as string_
         * ```
         * console.dir(SQL.getScalar('SELECT * FROM table'));
         * ```
         *
         * _Query as array_
         * ```
         * console.dir(SQL.getScalar([
         *      'SELECT',
         *      '   *',
         *      'FROM',
         *      '   table'
         * ]));
         * ```
         */
        getScalar: function(sql) {
            this.connect();
            sql = isArray(sql) ? sql.join('\n') : sql;
            try {
                return oracle.getScalar(this.handle, sql);
            }
            catch (e) {
                throw new SQLException(e, sql);
            }
        },


        /**
         * @function SQL.update
         *
         * ### Synopsis
         *
         * var affectedRows = SQL.update(query);
         *
         * Perform an update query (e.g. not a select type query) and return the number of affected rows.
         *
         * The query may be a string or an array.  If it is an array, this function will join that array with newline.  See examples below.
         *
         * @param {string|array} query - the query to perform (an update/delete/alter table/etc.)
         * @returns {int} affectedRows - the number of rows in the table affected by the update query.
         */
        update: function(sql) {
            this.connect();
			var autoCommit = this.transactionStack.length ? false : true;
            sql = isArray(sql) ? sql.join('\n') : sql;
			console.log(sql);
            try {
                return oracle.update(this.handle, sql, autoCommit);
            }
            catch (e) {
				console.dir(e);
				console.dir(sql);
                throw new SQLException(e, sql);
            }
        },

        /**
         * @function SQL.insertId
         *
         * ### Synopsis
         *
         * var id = SQL.insertId();
         *
         * Retrieves the ID generated for an AUTO_INCREMENT column by the previous query (usually INSERT or REPLACE).
         *
         * @returns {int} the ID.
         */
        insertId: function() {
            try {
                return oracle.getScalar(this.handle, 'SELECT LAST_INSERT_ID()');
            }
            catch (e) {
                throw new SQLException(e, 'SELECT LAST_INSERT_ID()');
            }

        },

        /**
         * @function SQL.startTransaction
         *
         * ### Synopsis
         *
         * SQL.startTransaction();
         *
         * Start a Oracle transaction.
         *
         * ### See Also
         *
         * The example at the top of this page.
         */
        startTransaction: function() {
            this.connect();
			var tid = 'trans_' + (++this.transactionId);
			this.transactionStack.push(tid);
            try {
                return oracle.update(this.handle, 'SAVEPOINT ' + tid);
            }
            catch (e) {
				this.transactionStack.pop();
                throw new SQLException(e, 'START TRANSACTION');
            }
        },

        /**
         * @function SQL.commit
         *
         * ### Synopsis
         *
         * SQL.commit();
         *
         * Commit a Oracle transaction.
         *
         * ### See Also
         *
         * The example at the top of this page.
         */
        commit: function() {
            this.connect();
			var tid = this.transactionStack.pop();
             try {
               return oracle.update(this.handle, 'COMMIT');
            }
            catch (e) {
                throw new SQLException(e, 'COMMIT');
            }
        },

        /**
         * @function SQL.rollback
         *
         * ### Synopsis
         *
         * SQL.rollback();
         *
         * Roll back (undo) a Oracle transaction.
         *
         * ### See Also
         *
         * The example at the top of this page.
         */
        rollback: function() {
            this.connect();
			var tid = this.transactionStack.pop();
            try {
                return oracle.update(this.handle, 'ROLLBACK TO SAVEPOINT ' + tid);
            }
            catch (e) {
                throw new SQLException(e, 'ROLLBACK');
            }
        },

        /**
         * @function SQL.quote
         *
         * ### Synopsis
         *
         * var s = SQL.quote(value);
         * var arr = SQL.quote(value);  // value is an array
         *
         * Quote and escape a value or array of values, suitable for usig in a Oracle query string.
         *
         * If a single value is passed, a single quoted value is returned.
         *
         * If an array is passed, an array of quoted values is returned.
         *
         * The values true, 'yes', false, and 'no' are turned into '1' and '0', respectively.
         *
         * ### Note
         * Quoting all values to be included in a query statement should prevent SQL injection.
         *
         * @param {string|array} value - the value that is to be quoted.
         * @returns {string|array} quoted - the quoted value or array of values.
         */
        quote: function(s) {
            if (isArray(s)) {
                var ret = [];
                s.each(function(e) {
                    ret.push(Oracle.prototype.quote(e));
                });
                return ret;
            }
            else if (s === null || s === undefined) {
                return 'NULL';
            }
            else if (s === true || s == 'yes') {
                return "'1'";
            }
            else if (s === false || s == 'no') {
                return "'0'";
            }
            else {
                s = s === undefined ? '' : s;
                return "'" + addslashes(s) + "'";
            }
        },

        close: function() {
            this.connect();
            oracle.close(this.handle);
            this.handle = null;
        }
    });

    exports.extend({
        Oracle: Oracle
    });

}());
