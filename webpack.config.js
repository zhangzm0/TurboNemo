const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    entry: './src/main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.[contenthash:8].js',
        clean: true,
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html',
            inject: true,
        }),
        new webpack.ProvidePlugin({
            PIXI: 'pixi.js-legacy',
        }),
    ],
    devServer: {
        static: './',
        host: '0.0.0.0',
        port: 8080,
        hot: true,
    },
};
