#!/usr/local/bin/silkjs

var process = require('builtin/process'),
    fs = require('fs'),
    console = require('console');

var cwd = fs.getcwd();

var env = process.env();
var OSX = env.OS === 'OSX';

var ZIPS = OSX ? [
    'instantclient-basic-10.2.0.4.0-macosx-x86.zip',
    'instantclient-sdk-10.2.0.4.0-macosx-x86.zip'
] : [
    'instantclient-basic-linux.x64-11.2.0.3.0.zip',
    'instantclient-sdk-linux.x64-11.2.0.3.0.zip'
];

var CLIENT = '/opt/instantclient'; // cwd + '/src/' + (OSX ? 'instantclient_10_2' : 'instantclient_11_2');

var CCFLAGS=[
    '-fPIC',
    '-I/usr/local/silkjs/src',
    '-I/usr/local/silkjs/src/v8/include',
    '-I' + CLIENT + '/sdk/include'
];

var LIBS=[
    '-L' + CLIENT + ' -locci -lclntsh',
    '-L/usr/local/silkjs/src/v8 -lv8'
];
var LDFLAGS = OSX ?
    // '-shared -Wl,-install_name,oracle_module.,-rpath,/usr/local/silkjs/contrib/Oracle/lib' :
	'-shared -Wl,-install_name,oracle_module.,-rpath,/opt/instantclient' :
	'-shared -Wl,-soname,oracle_module.so,-rpath,/opt/instantclient';

function exec(cmd) {
    console.log(cmd);
    process.exec(cmd);
    if (process.exec_result() !== 0) {
        console.log('exiting due to errors');
        process.exit(1);
    }
}

function client() {
    if (!fs.exists(CLIENT)) {
        fs.chdir('src');
        ZIPS.each(function(zip) {
            exec('unzip -o ' + cwd + '/instantclient/' + zip);
        });
        exec('sudo mkdir -p /opt');
        if (OSX) {
            exec('sudo mv instantclient_10_2 ' + CLIENT);
            fs.chdir(CLIENT);
            exec('ln -sf libocci.dylib.10.1 libocci.dylib');
            exec('xattr -d com.apple.quarantine libocci.dylib.10.1');
            exec('ln -sf libclntsh.dylib.10.1 libclntsh.dylib');
            exec('xattr -d com.apple.quarantine libclntsh.dylib.10.1');
            // exec('install_name_tool -id "@rpath/libv8.dylib" /usr/local/silkjs/src/v8/libv8.dylib');
            // exec('install_name_tool -change $(CURDIR)/$(V8LIB_DIR)/libv8.dylib @rpath/libv8.dylib /usr/local/silkjs/bin/silkjs');
            exec('install_name_tool -id @rpath/libocci.dylib.10.1 libocci.dylib.10.1');
            exec('install_name_tool -id @rpath/libclntsh.dylib.10.1 libclntsh.dylib.10.1');
            // exec('install_name_tool -change /b/227/rdbms/lib/libocci.dylib.10.1 @rpath/libocci.dylib.10.1 libocci.dylib.10.1');
        }
        else {
            exec('sudo mv instantclient_11_2 ' + CLIENT);
            fs.chdir(CLIENT);
            exec('ln -sf libocci.so.11.1 libocci.so');
            exec('ln -sf libclntsh.so.11.1 libclntsh.so');
        }
        fs.chdir(cwd + '/src');
    }
}

function install() {
    fs.chdir(cwd);
    exec('cp src/oracle_module.so lib');
    exec('mkdir -p /usr/local/silkjs/contrib/Oracle');
    exec('cp -rp index.js lib bin /usr/local/silkjs/contrib/Oracle');
	exec('ln -sf /usr/local/silkjs/contrib/Oracle/bin/oratool.js /usr/local/bin');
//    if (OSX) {
//        exec('cp ' + CLIENT + '/libocci.dylib.10.1 /usr/local/silkjs/contrib/Oracle/lib');
//        exec('cp ' + CLIENT + '/libclntsh.dylib.10.1 /usr/local/silkjs/contrib/Oracle/lib');
//    }
//	else {
//        exec('cp ' + CLIENT + '/libocci.so.11.1 /usr/local/silkjs/contrib/Oracle/lib');
//        exec('cp ' + CLIENT + '/libclntsh.so.11.1 /usr/local/silkjs/contrib/Oracle/lib');
//        exec('cp ' + CLIENT + '/libnnz11.so /usr/local/silkjs/contrib/Oracle/lib');
//		exec('chmod 0755 /usr/local/silkjs/contrib/Oracle/lib/lib*so*');
//	}
}

function all() {
   client();
    fs.chdir('src');
    exec('g++ -c ' + CCFLAGS.join(' ') + ' -o oracle.o oracle.cpp');
    exec('g++ ' + LDFLAGS + ' -o oracle_module.so oracle.o ' + LIBS.join(' '));
    install();
}

function clean() {
    exec('rm -rf src/*.o src/*.so ' + CLIENT);
}
function main(rule) {
    rule = rule || 'all';
    if (global[rule]) {
        global[rule]();
    }
    else {
        console.log('No rule for ' + rule);
    }
}
