module.exports = {
  bail: true,
  exit: true,
  timeout: 10000,
  require: [
    '@babel/polyfill',
    'dotenv/config',
    'test/config/register-babel.mocha.js'
  ]
};
