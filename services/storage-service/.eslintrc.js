module.exports = {
  extends: [
    '@hapi/eslint-config-hapi',
    'eslint-config-airbnb-base',
    'prettier'
  ],
  parser: 'babel-eslint',
  env: {
    browser: false,
    node: true,
    es6: true,
    mocha: true
  },
  rules: {
    'valid-jsdoc': [
      'error',
      {
        requireReturnType: true,
        requireReturnDescription: false,
        requireParamDescription: false
      }
    ],
    'comma-dangle': ['error', 'never'],
    'no-multi-spaces': 0,
    'no-underscore-dangle': 0,
    '@hapi/hapi/scope-start': 0,
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/*.test.js',
          `${resolve('./')}/test/utils/*.js`,
          '**/*.spec.js',
          '**/*.mocha.js'
        ]
      }
    ]
  }
};
