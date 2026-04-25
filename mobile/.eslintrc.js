module.exports = {
  extends: ['expo', 'eslint:recommended'],
  rules: {
    'no-unused-vars': 'warn',
    'react/prop-types': 'off',
  },
  ignorePatterns: ['node_modules/', '.expo/', 'dist/'],
};
