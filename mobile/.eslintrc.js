module.exports = {
  extends: ['expo', 'eslint:recommended'],
  env: {
    browser: true,
    node: true,
  },
  rules: {
    'no-unused-vars': 'warn',
    'react/prop-types': 'off',
  },
  ignorePatterns: ['node_modules/', '.expo/', 'dist/'],
  overrides: [
    {
      files: ['__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      env: { jest: true },
    },
  ],
};
