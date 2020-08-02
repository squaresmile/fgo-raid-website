var path = require("path");

module.exports = {
  performance: {
    hints: false,
  },
  devtool: "source-map",
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    compress: true,
    port: 9000,
  },
};
