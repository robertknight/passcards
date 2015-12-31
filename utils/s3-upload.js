var Q = require('q');
var s3 = require('s3');

function syncDir(localDir, bucket, remoteDir) {
  var accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  var secretKey = process.env.AWS_SECRET_KEY;

  if (!accessKeyId) {
    throw new Error('AWS_ACCESS_KEY_ID not set');
  }
  if (!secretKey) {
    throw new Error('AWS_SECRET_KEY not set');
  }

	var params = {
    localDir: localDir,
    deleteRemoved: false,
    s3Params: {
      ACL: 'public-read',
      Bucket: bucket,
      Prefix: remoteDir
    },
	};

  var client = s3.createClient({
    s3Options: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretKey,
    },
  });
  var uploader = client.uploadDir(params);
  return new Q.Promise(function (resolve, reject) {
    uploader.on('error', function (err) {
      reject(err);
    });
    uploader.on('end', function () {
      resolve();
    });
  });
}

module.exports = {
  syncDir: syncDir,
};

