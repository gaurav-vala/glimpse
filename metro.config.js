// Patch Node.js fs to queue and retry on EMFILE (too many open files) on Windows
try {
  const fs = require('fs');
  const gracefulFs = require('graceful-fs');
  gracefulFs.gracefulify(fs);
} catch {}

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// On Windows, excessive parallel Metro workers can exhaust OS file handles (EMFILE: too many open files)
config.maxWorkers = 2;

// Exclude native android build outputs, releases, and git from file watching to prevent handle exhaustion
if (Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList.push(
    /releases[\\/].*/,
    /android[\\/]app[\\/]build[\\/].*/,
    /android[\\/]\.gradle[\\/].*/,
    /\.git[\\/].*/
  );
}

module.exports = config;
