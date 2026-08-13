const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const { ModuleFederationPlugin } = require("webpack").container;
const deps = require("./package.json").dependencies;

module.exports = {
  entry: "./src/index.js",
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  devServer: {
    port: 3002,
    historyApiFallback: true,
    headers: { "Access-Control-Allow-Origin": "*" },
  },
  output: {
    publicPath: process.env.CDN_PUBLIC_PATH || "auto",
    filename: "[name].[contenthash].js",
    chunkFilename: "[name].[contenthash].chunk.js",
    clean: true,
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: { presets: ["@babel/preset-env", "@babel/preset-react"] },
        },
      },
    ],
  },
  plugins: [
    // Requirement: config.js for different environments.
    new webpack.DefinePlugin({
      "process.env.APP_ENV": JSON.stringify(process.env.APP_ENV || "local"),
    }),
    new ModuleFederationPlugin({
      name: "mfeOrders",
      filename: "remoteEntry.js",
      exposes: {
        "./OrdersApp": "./src/OrdersApp",
      },
      shared: {
        react: { singleton: true, requiredVersion: deps.react },
        "react-dom": { singleton: true, requiredVersion: deps["react-dom"] },
        "react-router-dom": { singleton: true, requiredVersion: deps["react-router-dom"] },
        "@demo/shared-auth": { singleton: true, requiredVersion: false },
        "@apollo/client": { singleton: true, requiredVersion: deps["@apollo/client"] },
      },
    }),
    new HtmlWebpackPlugin({ template: "./public/index.html" }),
  ],
};
