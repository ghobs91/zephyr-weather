const {FlatCompat} = require('@eslint/eslintrc');

// @react-native/eslint-config ships a legacy (eslintrc) config, so wrap it
// with FlatCompat for ESLint 9. Replaces the old .eslintrc.js.
const compat = new FlatCompat({baseDirectory: __dirname});

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'ios/Pods/**',
      'ios/build/**',
      'build/**',
      'android/**',
      'coverage/**',
      '*.log',
    ],
  },
  ...compat.extends('@react-native'),
  {
    rules: {
      'react-native/no-inline-styles': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },
];
