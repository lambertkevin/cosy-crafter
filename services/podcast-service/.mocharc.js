module.exports = {
  bail: true,
  exit: true,
  timeout: 10000,
  require: ['@babel/register', '@babel/polyfill', 'dotenv/config']
};
