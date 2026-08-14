const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const { ModuleFederationPlugin } = require("webpack").container;
const deps = require("./package.json").dependencies;

module.exports = {
  entry: "./src/index.js",
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  devServer: {
    port: 3001,
    historyApiFallback: true,
    headers: { "Access-Control-Allow-Origin": "*" },
  },
  output: {
    publicPath: process.env.CDN_PUBLIC_PATH || "auto",
    // remoteEntry.js name is fixed by ModuleFederationPlugin.filename below
    // (must stay stable so the shell's remote URL never changes). Regular
    // chunks get content hashes for CDN immutable caching.
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
      name: "mfeProducts",
      filename: "remoteEntry.js",
      exposes: {
        // Requirement #1: this is what the shell lazy-loads.
        "./ProductsApp": "./src/ProductsApp",
      },
      shared: {
        react: { singleton: true, requiredVersion: deps.react },
        "react-dom": { singleton: true, requiredVersion: deps["react-dom"] },
        "react-router-dom": { singleton: true, requiredVersion: deps["react-router-dom"] },
        "@mui/material": { singleton: true, requiredVersion: deps["@mui/material"] },
        "@emotion/react": { singleton: true, requiredVersion: deps["@emotion/react"] },
        "@emotion/styled": { singleton: true, requiredVersion: deps["@emotion/styled"] },
        "@demo/shared-auth": { singleton: true, requiredVersion: false },
        "@apollo/client": { singleton: true, requiredVersion: deps["@apollo/client"] },
      },
    }),
    new HtmlWebpackPlugin({ template: "./public/index.html" }),
  ],
};
