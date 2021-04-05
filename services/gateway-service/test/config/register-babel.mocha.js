const path = require('path');

require('@babel/register')({
  configFile: path.resolve('./babel.config.json'),
  ignore: [/node_modules/]
});
