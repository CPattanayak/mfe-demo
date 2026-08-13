const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const { ModuleFederationPlugin } = require("webpack").container;
const path = require("path");
const deps = require("./package.json").dependencies;

// Requirement #2 (updated): local dev / docker-compose default to MinIO or
// localhost dev servers; QA/prod point these at the CDN edge — see
// docker-compose.qa.yml and k8s/qa/cdn.yaml.
const PRODUCTS_REMOTE_URL =
  process.env.PRODUCTS_REMOTE_URL || "http://localhost:3001/remoteEntry.js";
const ORDERS_REMOTE_URL =
  process.env.ORDERS_REMOTE_URL || "http://localhost:3002/remoteEntry.js";

// When set (QA/prod builds), assets are addressed via the CDN's public URL
// so hashed chunk requests resolve correctly regardless of which host
// served index.html. Left as "auto" for local dev.
const PUBLIC_PATH = process.env.CDN_PUBLIC_PATH || "auto";

module.exports = {
  entry: "./src/index.js",
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  devServer: {
    port: 3000,
    historyApiFallback: true,
    headers: { "Access-Control-Allow-Origin": "*" },
  },
  output: {
    publicPath: PUBLIC_PATH,
    // Content-hashed filenames so the CDN can cache them as immutable
    // (Cache-Control: max-age=31536000, immutable) — a new deploy produces
    // new filenames instead of overwriting a cached one.
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
    // Requirement: config.js for different environments — APP_ENV is
    // statically baked into the bundle here so frontend/shared-auth's
    // config.js resolves to exactly one environment's URLs at build time.
    new webpack.DefinePlugin({
      "process.env.APP_ENV": JSON.stringify(process.env.APP_ENV || "local"),
    }),
    new ModuleFederationPlugin({
      name: "shell",
      remotes: {
        // Requirement #1: React Module Federation micro-frontends
        mfeProducts: `mfeProducts@${PRODUCTS_REMOTE_URL}`,
        mfeOrders: `mfeOrders@${ORDERS_REMOTE_URL}`,
      },
      shared: {
        react: { singleton: true, requiredVersion: deps.react },
        "react-dom": { singleton: true, requiredVersion: deps["react-dom"] },
        "react-router-dom": { singleton: true, requiredVersion: deps["react-router-dom"] },
        // Requirement #4: ONE shared auth/token/Apollo instance across every
        // remote — loaded once, reused everywhere.
        "@demo/shared-auth": { singleton: true, requiredVersion: false },
      },
    }),
    new HtmlWebpackPlugin({ template: "./public/index.html" }),
  ],
};
