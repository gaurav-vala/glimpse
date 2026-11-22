// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// On Windows, excessive parallel Metro workers can exhaust OS file handles (EMFILE: too many open files)
config.maxWorkers = 2;

module.exports = config;
