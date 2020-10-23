var fs = require('fs-extra');
var path = require('path');
const { version } = require('../package');
var exec = require('child_process').exec;

var cwd = process.cwd();

var file = path.join(cwd, 'dist', 'datadive-' + version + '.js');
var minfile = path.join(cwd, 'dist', 'datadive-' + version + '-min.js');
var mingzfile = path.join(cwd, 'dist', 'datadive-' + version + '-min.gz.js');

fs.copySync(path.join(cwd, 'datadive.js'), file);
fs.copySync(path.join(cwd, 'datadive.min.js'), minfile);
exec('gzip < ' + minfile + ' > ' + mingzfile);

const umdFile = path.join(cwd, 'dist', 'datadive-' + version + '.umd.js');
const umdMinfile = path.join(cwd, 'dist', 'datadive-' + version + '-min.umd.js');
const umdMingzfile = path.join(cwd, 'dist', 'datadive-' + version + '-min.umd.gz.js');

fs.copySync(path.join(cwd, 'datadive.umd.js'), umdFile);
fs.copySync(path.join(cwd, 'datadive.min.js'), umdMinfile);
exec('gzip < ' + umdMinfile + ' > ' + umdMingzfile);
