const path = require('path');

module.exports = {
  chainWebpack: config => {
    const svgRule = config.module.rule('svg');

    svgRule.uses.clear();

    svgRule
      .oneOf('inline')
      .resourceQuery(/inline/)
      .use('vue-svg-loader')
      .loader('vue-svg-loader')
      .end()
      .end()
      .oneOf('external')
      .use('file-loader')
      .loader('file-loader')
      .options({
        name: 'assets/[name].[hash:8].[ext]'
      });
  },

  css: {
    loaderOptions: {
      sass: {
        sassOptions: {
          includePaths: [path.resolve('node_modules', 'foundation-sites', 'scss')]
        },
        prependData: '@import "src/assets/scss/imports";'
      }
    }
  }
};
