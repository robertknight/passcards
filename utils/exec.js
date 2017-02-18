'use strict';

const { spawn } = require('child_process');

const DEFAULT_OPTS = {
	/** If true, echo stdout from the child process to the parent's stdout. */
	logStdout: true,
};

/**
 * Execute a command and return an [exitCode, stdout, stderr] tuple.
 */
function exec(args, opts = DEFAULT_OPTS) {
	return new Promise((resolve) => {
		const proc = spawn(args[0], args.slice(1));
		let stdout = '';
		let stderr = '';
		proc.stdout.on('data', function(data) {
			stdout += data.toString();
			if (opts.logStdout) {
				console.log(data.toString());
			}
		});
		proc.stderr.on('data', function(data) {
			stderr += data.toString();
			console.error(data.toString());
		});
		proc.on('close', function(status) {
			resolve([status, stdout, stderr]);
		});
	});
}

module.exports = exec;
