var child_process = require('child_process');
var fs = require('fs');

function exec() {
	return new Promise(resolve => {
		var proc = child_process.spawn(arguments[0], Array.prototype.slice.call(arguments,1));
		var stdout = '';
		var stderr = '';
		proc.stdout.on('data', function(data) {
			stdout += data.toString();
		});
		proc.stderr.on('data', function(data) {
			stderr += data.toString();
			console.log(data.toString());
		});
		proc.on('close', function(status) {
			resolve([status, stdout, stderr]);
		});
	});
}

module.exports = exec;
