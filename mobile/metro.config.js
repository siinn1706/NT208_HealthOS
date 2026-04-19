const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

// Map TS path aliases (`@/*`, `@app/*`) to real folders so Metro resolves them
// at runtime exactly the way TypeScript does at compile time. Avoids needing
// `babel-plugin-module-resolver` and keeps a single source of truth.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@": path.resolve(__dirname, "src"),
  "@app": path.resolve(__dirname, "app"),
};

module.exports = config;
