const crypto = require('crypto');
const origCreateHash = crypto.createHash;
crypto.createHash = function (algorithm, options) {
  return origCreateHash.call(this, algorithm === 'md4' ? 'sha256' : algorithm, options);
};
