// 1. Patch Node.js standard fs with graceful-fs to queue/retry synchronous and callback-based calls on EMFILE
try {
  const fs = require('fs');
  const gracefulFs = require('graceful-fs');
  gracefulFs.gracefulify(fs);
} catch {}

// 2. Patch Node.js node:fs/promises (used by Metro's transformer and asset server) to catch EMFILE and retry
try {
  const fsPromises = require('node:fs/promises');
  const origOpen = fsPromises.open;
  const origReadFile = fsPromises.readFile;

  if (origOpen) {
    fsPromises.open = async function (...args) {
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          return await origOpen.apply(this, args);
        } catch (err) {
          if (err && err.code === 'EMFILE' && attempt < 7) {
            await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
            continue;
          }
          throw err;
        }
      }
      return await origOpen.apply(this, args);
    };
  }

  if (origReadFile) {
    fsPromises.readFile = async function (...args) {
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          return await origReadFile.apply(this, args);
        } catch (err) {
          if (err && err.code === 'EMFILE' && attempt < 7) {
            await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
            continue;
          }
          throw err;
        }
      }
      return await origReadFile.apply(this, args);
    };
  }
} catch {}

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 3. High-Performance In-Memory Cache Store
// Replaces the disk-based BinaryFileStore that opens thousands of .mp files in Windows Temp,
// completely eliminating disk file handle exhaustion while providing instant in-memory transforms.
class MemoryStore {
  constructor() {
    this.name = 'MemoryStore';
    this.map = new Map();
  }
  get(key) {
    return this.map.get(key.toString('hex')) ?? null;
  }
  set(key, value) {
    this.map.set(key.toString('hex'), value);
  }
  clear() {
    this.map.clear();
  }
}

config.cacheStores = [new MemoryStore()];

// 4. On Windows, throttle worker pool to prevent simultaneous handle spikes
config.maxWorkers = 2;

// 5. Exclude heavy build directories, releases, and git from Metro's file crawler
if (Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList.push(
    /releases[\\/].*/,
    /android[\\/]app[\\/]build[\\/].*/,
    /android[\\/]\.gradle[\\/].*/,
    /\.git[\\/].*/
  );
}

module.exports = config;
