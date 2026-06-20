const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    entry: {
        main: './src/main.js',
        'compile-dump': './test/compile-dump.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[contenthash:8].js',
        clean: true,
    },
    watchOptions: {
        ignored: /node_modules/,
        poll: 1000,
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html',
            inject: true,
            chunks: ['main'],
            filename: 'index.html',
        }),
        new HtmlWebpackPlugin({
            template: 'test/compile-dump.html',
            inject: true,
            chunks: ['compile-dump'],
            filename: 'compile-dump.html',
        }),
        new webpack.ProvidePlugin({
            PIXI: 'pixi.js-legacy',
        }),
    ],
    devServer: {
        static: './',
        host: '0.0.0.0',
        port: 8158,
        hot: true,
        watchFiles: {
            paths: ['src/**/*'],
            options: {
                ignored: /node_modules/,
            },
        },
    },
};
