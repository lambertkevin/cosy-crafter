module.exports = {
  bail: true,
  exit: true,
  timeout: 10000,
  require: [
    "@babel/register",
    "@babel/polyfill",
    "test/config/register-babel.mocha.js",
  ],
};
