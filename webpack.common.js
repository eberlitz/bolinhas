const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const mode = process.env.NODE_ENV || "production";

const CODE = (id) => `
<!-- Global site tag (gtag.js) - Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag("js", new Date());

    gtag("config", "${id}");
  </script>
`;

class GoogleAnalyticsPlugin {
  constructor(id) {
    this.id = id;
  }
  apply(compiler) {
    const id = this.id;
    if (compiler.options.mode == "production") {
      compiler.hooks.compilation.tap("ga", (compilation) => {
        compilation.hooks.htmlWebpackPluginAfterHtmlProcessing.tap(
          "ga",
          ({ html }) => ({
            html: html.replace("</head>", CODE(id) + "</head>"),
          })
        );
      });
    }
  }
}

module.exports = {
  mode: mode,
  optimization: {
    usedExports: true,
  },
  entry: {
    app: "./src/index.ts",
    landing: "./src/landing/index.ts",
  },
  output: {
    globalObject: "self",
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
  },
  plugins: [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "[name].css",
      chunkFilename: "[id].css",
    }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      title: "bolinhas",
      template: "./src/index.html",
      chunks: ["app"],
    }),
    new HtmlWebpackPlugin({
      filename: "landing.html",
      title: "Bolinhas",
      template: "./src/landing/landing.html",
      chunks: ["landing"],
    }),
    new GoogleAnalyticsPlugin("UA-170107215-1"),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.scss$/,
        use: [
          mode !== "production" ? "style-loader" : MiniCssExtractPlugin.loader,
          "css-loader", // translates CSS into CommonJS
          {
            loader: "sass-loader",
            options: { implementation: require("dart-sass") },
          }, // compiles Sass to CSS, using Node Sass by default
        ],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ["file-loader"],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: ["file-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};
