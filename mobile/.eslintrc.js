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
      // TypeScript already validates identifier resolution; ESLint's no-undef
      // misfires on DOM/lib types like RequestInit, URL, etc.
      files: ['**/*.ts', '**/*.tsx'],
      rules: { 'no-undef': 'off' },
    },
    {
      files: ['__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      env: { browser: true, node: true, jest: true },
    },
    {
      // Jest mock factories and the global setup file run under the Jest runtime,
      // so they need both jest globals and React (used in JSX-typed mocks).
      files: ['__mocks__/**/*.{ts,tsx}', 'jest.setup.ts'],
      env: { browser: true, node: true, jest: true },
      globals: { React: 'readonly' },
    },
  ],
};
