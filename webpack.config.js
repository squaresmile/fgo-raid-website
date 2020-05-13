var path = require("path");

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "./main.js",
  },
  performance: {
    hints: false,
  },
  devtool: "source-map",
  resolve: {
    extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: "awesome-typescript-loader" },
      { test: /\.js$/, loader: "source-map-loader" },
    ],
  },
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    compress: true,
    port: 9000,
  },
};
