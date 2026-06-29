const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch only the specific monorepo-root paths Metro actually needs (hoisted
// node_modules + shared contracts) instead of the whole repo root. The backend
// writes churning temp files under <root>/.data (MinIO/Postgres); watching the
// entire root makes Metro's Windows fallback watcher crash (ENOENT) when those
// vanish mid-walk. The watcher ignores blockList for resolution only, not for
// directory crawling, so scoping watchFolders is the reliable fix.
config.watchFolders = Array.from(
  new Set([
    ...(config.watchFolders ?? []),
    path.resolve(monorepoRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'shared'),
  ]),
);
config.resolver.nodeModulesPaths = Array.from(
  new Set([
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
    ...(config.resolver.nodeModulesPaths ?? []),
  ]),
);

// We watch the monorepo root so hoisted node_modules resolve, but the backend
// writes churning temp files under .data (MinIO/Postgres), and Python caches
// shift constantly. Metro's Windows fallback watcher crashes (ENOENT) when such
// files vanish mid-walk, so exclude these volatile backend paths from crawling.
config.resolver.blockList = exclusionList([
  /\/\.data\/.*/,
  /\/backend\/\.venv\/.*/,
  /\/__pycache__\/.*/,
  /\/\.(pytest_cache|hypothesis|git)\/.*/,
]);

module.exports = config;
