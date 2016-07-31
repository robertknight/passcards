'use strict';

var glob = require('glob');
var path = require('path');

/**
 * Return the input source files used by a TypeScript project.
 *
 * @param {Object} config - The tsconfig.json config object for the project
 * @param {string} projectFile - Optional. The path to the `tsconfig.json`
 *        project file.
 */
function tsinputs(config, projectFile) {
  projectFile = projectFile || '';

  var srcFiles = config.include.reduce(function (files, pattern) {
    if (pattern[0] === '!') {
      return files;
    }
    return files.concat(glob.sync(pattern, {ignore: './node_modules/**'}));
  }, []).map(function (filePath) {
    return path.resolve(path.dirname(projectFile), filePath);
  });

  return srcFiles;
}

module.exports = tsinputs;

