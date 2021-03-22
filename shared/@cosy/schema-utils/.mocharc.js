module.exports = {
  bail: true,
  exit: true,
  require: [
    "@babel/register",
    "@babel/polyfill",
    "test/config/register-babel.mocha.js",
  ],
};
