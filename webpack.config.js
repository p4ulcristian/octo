const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/bundle.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'AppBundle',
    libraryTarget: 'window'
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    modules: ['node_modules'],
  },
  target: 'electron-renderer'
};