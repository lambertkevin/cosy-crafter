module.exports = {
  extends: ['@hapi/eslint-config-hapi', 'eslint-config-airbnb-base'],
  parser: 'babel-eslint',
  env: {
    browser: false,
    node: true,
    es6: true,
    mocha: true
  },
  rules: {
    'valid-jsdoc': ['error', {
      requireReturnType: true,
      requireReturnDescription: false,
      requireParamDescription: false
    }],
    'comma-dangle': ['error', 'never'],
    'no-multi-spaces': 0,
    'no-underscore-dangle': 0,
    '@hapi/hapi/scope-start': 0
  }
};
