const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Web packages carry their own React copy; the app must use exactly one.
const reactRoot = path.resolve(workspaceRoot, 'node_modules/react');
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    const sub = moduleName === 'react' ? 'index.js' : moduleName.slice('react/'.length);
    const file = path.join(reactRoot, sub.endsWith('.js') ? sub : `${sub}.js`);
    return { type: 'sourceFile', filePath: file };
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};
module.exports = config;
