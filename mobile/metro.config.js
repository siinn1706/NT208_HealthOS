const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = Array.from(new Set([...(config.watchFolders ?? []), monorepoRoot]));
config.resolver.nodeModulesPaths = Array.from(
  new Set([
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
    ...(config.resolver.nodeModulesPaths ?? []),
  ]),
);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pathRegex = (value) => value.split(/[\\/]+/).map(escapeRegex).join('[/\\\\]');
const ignoredRepoPaths = ['.data', '.tmp', '.pytest_cache', '.git', 'backend/.venv', 'frontend/.next', 'plans'];
const ignoredRepoPathPatterns = ignoredRepoPaths.map(
  (repoPath) => new RegExp(`^${pathRegex(path.resolve(monorepoRoot, repoPath))}(?:[/\\\\].*)?$`),
);
const existingBlockList = config.resolver.blockList;

config.resolver.blockList = [
  ...(Array.isArray(existingBlockList) ? existingBlockList : [existingBlockList].filter(Boolean)),
  ...ignoredRepoPathPatterns,
];

module.exports = config;
