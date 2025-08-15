import path from 'path';
import { fileURLToPath } from 'url';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: {
    apiInterceptor: './src/contentScript/apiInterceptor.ts',
    contentScript: './src/contentScript/index.ts',
    background: './src/background/index.ts',
    popup: './src/popup/index.tsx',
    options: './src/options/index.tsx',
    bookmarks: './src/bookmarks/index.tsx',
    debug: './src/bookmarks/debug.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
    publicPath: '',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        // HTMLファイルをコピー
        {
          from: '*.html',
          to: '[name][ext]',
        },
        // manifest.jsonをコピー
        {
          from: 'manifest.json',
          to: 'manifest.json',
        },
        // アイコンファイルをコピー
        {
          from: 'icons',
          to: 'icons',
        },
      ],
    }),
  ],
  mode: 'development',
  devtool: 'source-map',
}; 