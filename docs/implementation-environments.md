# 🛠️ Comiketter 実装環境・技術仕様

## 🏗️ 開発環境構成

### 基本技術スタック

| 分類 | 技術 | バージョン | 用途 |
|------|------|-----------|------|
| **プラットフォーム** | Chrome Extension | Manifest v3 | 拡張機能基盤 |
| **言語** | TypeScript | 5.0+ | メイン開発言語 |
| **フレームワーク** | React | 18.0+ | UI構築 |
| **ビルドツール** | Webpack | 5.0+ | バンドル・ビルド |
| **UIライブラリ** | Mantine | 7.0+ | コンポーネントライブラリ |
| **データベース** | IndexedDB | - | ローカルデータ保存 |
| **パッケージ管理** | Yarn | 1.22+ | 依存関係管理 |
| **テスト** | Jest | 29.0+ | ユニットテスト |
| **Lint/Format** | ESLint + Prettier | 8.0+ | コード品質管理 |
| **Gitフック** | Husky | 8.0+ | コミット前チェック |

### 開発ツール

| ツール | 用途 | 設定ファイル |
|--------|------|-------------|
| **VS Code** | メインエディタ | `.vscode/settings.json` |
| **Chrome DevTools** | デバッグ・テスト | - |
| **React Developer Tools** | Reactコンポーネントデバッグ | - |
| **Redux DevTools** | 状態管理デバッグ | - |

## 📁 プロジェクト構造

```
Comiketter/
├── src/                          # ソースコード
│   ├── background/               # バックグラウンドスクリプト
│   │   ├── index.ts             # メインエントリーポイント
│   │   ├── messageHandler.ts    # メッセージハンドラー
│   │   └── downloadManager.ts   # ダウンロード管理
│   ├── contentScript/           # コンテンツスクリプト
│   │   ├── index.ts             # メインエントリーポイント
│   │   ├── apiInterceptor.ts    # API傍受
│   │   ├── tweetObserver.ts     # ツイート監視
│   │   ├── sidebarButton.ts     # サイドバーボタン
│   │   ├── tweetInfoExtractor.ts # ツイート情報抽出
│   │   └── buttonManager/       # ボタン管理
│   │       ├── baseButton.ts    # 基本ボタンクラス
│   │       ├── bookmarkButton.ts # CBボタン
│   │       ├── downloadButton.ts # DLボタン
│   │       ├── buttonFactory.ts # ボタンファクトリー
│   │       └── index.ts
│   ├── bookmarks/               # ブックマークページ
│   │   ├── index.tsx            # エントリーポイント
│   │   ├── BookmarkPage.tsx     # メインページ
│   │   ├── BookmarkList.tsx     # ブックマーク一覧
│   │   └── BookmarkDetail.tsx   # ブックマーク詳細
│   ├── components/              # 再利用可能なUIコンポーネント
│   │   ├── BookmarkSelector.tsx # CB選択UI
│   │   ├── BookmarkManager.tsx  # CB管理UI
│   │   └── FilenameSettings.tsx # ファイル名設定
│   ├── options/                 # オプションページ
│   │   ├── index.tsx            # エントリーポイント
│   │   └── OptionsApp.tsx       # メインアプリ
│   ├── popup/                   # ポップアップページ
│   │   ├── index.tsx            # エントリーポイント
│   │   └── PopupApp.tsx         # メインアプリ
│   ├── hooks/                   # カスタムReactフック
│   ├── stores/                  # 状態管理
│   ├── test/                    # テストファイル
│   ├── types/                   # 型定義
│   │   ├── index.ts             # メイン型定義
│   │   └── api.d.ts             # API型定義
│   └── utils/                   # ユーティリティ関数
│       ├── bookmarkManager.ts   # CB管理
│       ├── storage.ts           # ストレージ管理
│       ├── filenameGenerator.ts # ファイル名生成
│       └── constants.ts         # 定数定義
├── docs/                        # ドキュメント
├── icons/                       # アイコン画像
├── manifest.json                # 拡張機能マニフェスト
├── options.html                 # オプションページHTML
├── popup.html                   # ポップアップHTML
├── bookmarks.html               # ブックマークページHTML
├── webpack.config.mjs           # Webpack設定
├── jest.config.ts               # Jest設定
├── eslint.config.mjs            # ESLint設定
├── prettier.config.mjs          # Prettier設定
├── tsconfig.json                # TypeScript設定
└── package.json                 # パッケージ設定
```

## ⚙️ 設定ファイル詳細

### package.json
```json
{
  "name": "comiketter",
  "version": "1.0.0",
  "description": "X（Twitter）専用Chrome拡張機能",
  "main": "src/background/index.ts",
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "test": "jest",
    "lint": "eslint src/**/*.{ts,tsx}",
    "format": "prettier --write src/**/*.{ts,tsx}",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@mantine/core": "^7.0.0",
    "@mantine/hooks": "^7.0.0"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.254",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/jest": "^29.5.0",
    "typescript": "^5.0.0",
    "webpack": "^5.88.0",
    "webpack-cli": "^5.1.0",
    "jest": "^29.5.0",
    "eslint": "^8.45.0",
    "prettier": "^3.0.0",
    "husky": "^8.0.0"
  }
}
```

### webpack.config.mjs
```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: {
    background: './src/background/index.ts',
    contentScript: './src/contentScript/index.ts',
    popup: './src/popup/index.tsx',
    options: './src/options/index.tsx',
    bookmarks: './src/bookmarks/index.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  }
};
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### jest.config.ts
```typescript
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### eslint.config.mjs
```javascript
export default [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      '@typescript-eslint': '@typescript-eslint/eslint-plugin',
      'react': 'eslint-plugin-react',
      'react-hooks': 'eslint-plugin-react-hooks'
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
];
```

### prettier.config.mjs
```javascript
export default {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf'
};
```

## 🔧 ビルド・デプロイ

### 開発ビルド
```bash
# 開発モードでビルド（監視モード）
yarn dev

# 本番ビルド
yarn build

# テスト実行
yarn test

# 型チェック
yarn type-check
```

### Chrome拡張機能の読み込み
1. Chromeで `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist` フォルダを選択

### 本番デプロイ
```bash
# 本番ビルド
yarn build

# distフォルダをZIP化
zip -r comiketter.zip dist/

# Chrome Web Storeにアップロード
```

## 🧪 テスト環境

### テスト構造
```
src/test/
├── setup.ts                    # テストセットアップ
├── bookmarkManager.test.ts     # ブックマーク管理テスト
├── filenameGenerator.test.ts   # ファイル名生成テスト
└── bookmark-test.html          # ブラウザテスト用HTML
```

### テスト実行
```bash
# 全テスト実行
yarn test

# 特定ファイルのテスト
yarn test bookmarkManager.test.ts

# カバレッジ付きテスト
yarn test --coverage

# ウォッチモード
yarn test --watch
```

## 🔍 デバッグ環境

### ContentScript デバッグ
1. XページでF12を押してDevToolsを開く
2. Consoleタブでログを確認
3. Sourcesタブでブレークポイントを設定

### Background Script デバッグ
1. `chrome://extensions/` で拡張機能の「詳細」をクリック
2. 「Service Worker を検査」をクリック
3. DevToolsでデバッグ

### React コンポーネント デバッグ
1. React Developer Tools拡張機能をインストール
2. ポップアップやオプションページでコンポーネントを検査

## 📊 パフォーマンス監視

### メモリ使用量監視
```javascript
// メモリ使用量をログ出力
console.log('Memory usage:', performance.memory);
```

### 処理時間計測
```javascript
// 処理時間を計測
const startTime = performance.now();
// 処理実行
const endTime = performance.now();
console.log(`Processing time: ${endTime - startTime}ms`);
```

## 🔒 セキュリティ設定

### Content Security Policy
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 権限設定
```json
{
  "permissions": [
    "storage",
    "downloads",
    "activeTab"
  ],
  "host_permissions": [
    "https://twitter.com/*",
    "https://x.com/*"
  ]
}
```

## 📈 監視・ログ

### ログレベル
```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}
```

### ログ出力
```typescript
class Logger {
  static log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${LogLevel[level]}] ${message}`, data);
  }
}
```

この実装環境ドキュメントにより、Comiketterの開発・ビルド・デプロイ・テスト・デバッグの全工程が明確になり、効率的な開発が可能になります。 