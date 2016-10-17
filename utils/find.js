var findit = require('findit');
var path = require('path');

module.exports = function(rootDir, opts) {
	var finder = findit(rootDir);
	var fileList = [];

	return new Promise(resolve => {
		finder.on('directory', function(dir, stat, stop) {
			if (opts.ignoredDirs && opts.ignoredDirs.indexOf(path.basename(dir)) !== -1) {
				stop();
			}
		});

		finder.on('file', function(file, stat) {
			if (!opts.filter || opts.filter(file, stat)) {
				fileList.push(file);
			}
		});

		finder.on('end', function() {
			resolve(fileList);
		});
	});
}
