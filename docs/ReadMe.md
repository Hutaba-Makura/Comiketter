# 📚 Comiketter - X（Twitter）専用Chrome拡張機能

## 🎯 プロジェクト概要

Comiketterは、コミックマーケット参加者向けのX（旧Twitter）専用Chrome拡張機能です。TypeScript、React、Webpack、Mantine、IndexedDB、Jest、ESLint、Prettier、Huskyを使用しています。

## 📁 ファイル構成

```
Comiketter/
├── src/
│   ├── background/           # バックグラウンドスクリプト
│   │   ├── index.ts         # メインエントリーポイント
│   │   ├── messageHandler.ts # メッセージハンドラー
│   │   └── downloadManager.ts # ダウンロード管理
│   ├── contentScript/        # コンテンツスクリプト
│   │   ├── index.ts         # メインエントリーポイント
│   │   ├── apiInterceptor.ts # API傍受
│   │   ├── tweetObserver.ts  # ツイート監視
│   │   ├── sidebarButton.ts  # サイドバーボタン
│   │   ├── tweetInfoExtractor.ts # ツイート情報抽出
│   │   └── buttonManager/    # ボタン管理
│   │       ├── baseButton.ts # 基本ボタンクラス
│   │       ├── bookmarkButton.ts # CBボタン
│   │       ├── downloadButton.ts # DLボタン
│   │       ├── buttonFactory.ts # ボタンファクトリー
│   │       └── index.ts
│   ├── bookmarks/           # ブックマークページ
│   │   ├── index.tsx        # エントリーポイント
│   │   ├── BookmarkPage.tsx # メインページ
│   │   ├── BookmarkList.tsx # ブックマーク一覧
│   │   └── BookmarkDetail.tsx # ブックマーク詳細
│   ├── components/          # 再利用可能なUIコンポーネント
│   │   ├── BookmarkSelector.tsx # CB選択UI
│   │   ├── BookmarkManager.tsx # CB管理UI
│   │   └── FilenameSettings.tsx # ファイル名設定
│   ├── options/             # オプションページ
│   │   ├── index.tsx        # エントリーポイント
│   │   └── OptionsApp.tsx   # メインアプリ
│   ├── popup/               # ポップアップページ
│   │   ├── index.tsx        # エントリーポイント
│   │   └── PopupApp.tsx     # メインアプリ
│   ├── hooks/               # カスタムReactフック
│   ├── stores/              # 状態管理
│   ├── test/                # テストファイル
│   ├── types/               # 型定義
│   │   ├── index.ts         # メイン型定義
│   │   └── api.d.ts         # API型定義
│   └── utils/               # ユーティリティ関数
│       ├── bookmarkManager.ts # CB管理
│       ├── storage.ts       # ストレージ管理
│       ├── filenameGenerator.ts # ファイル名生成
│       └── constants.ts     # 定数定義
├── docs/                    # ドキュメント
├── icons/                   # アイコン画像
├── manifest.json            # 拡張機能マニフェスト
├── options.html             # オプションページHTML
├── popup.html               # ポップアップHTML
├── bookmarks.html           # ブックマークページHTML
├── webpack.config.mjs       # Webpack設定
├── jest.config.ts           # Jest設定
├── eslint.config.mjs        # ESLint設定
├── prettier.config.mjs      # Prettier設定
├── tsconfig.json            # TypeScript設定
└── package.json             # パッケージ設定
```

## 🧩 機能要件

### ✅ 実装済み機能

| 機能カテゴリ | 実装状況 | 詳細 |
|-------------|----------|------|
| **API傍受機能** | ✅ 完了 | XのGraphQL API通信を傍受し、ツイート情報を取得 |
| **ツイート監視** | ✅ 完了 | MutationObserverによる動的ツイート監視 |
| **CBボタン** | ✅ 完了 | ツイートにカスタムブックマークボタンを追加 |
| **DLボタン** | ✅ 完了 | メディアツイートにダウンロードボタンを追加 |
| **CB選択UI** | ✅ 完了 | チェックリスト形式のブックマーク選択UI |
| **CB管理** | 未完了 | ブックマークの作成・編集・削除機能 |
| **サイドバーボタン** | ✅ 完了 | Xサイドバーにカスタムブックマークボタンを追加 |
| **ブックマークページ** | 未完了 | 保存したブックマークを表示する専用ページ |
| **テーマ検出** | ✅ 完了 | Xのライト/ダーク/ブラックテーマを自動検出 |
| **ファイル名生成** | ✅ 完了 | TwitterMediaHarvest準拠のファイル名パターン |
| **ストレージ管理** | 不明 | IndexedDBによるデータ永続化 |
| **ダウンロード管理** | ✅ 完了 | chrome.downloads APIによるファイル保存 |

### 🔄 開発中機能

| 機能カテゴリ | 実装状況 | 詳細 |
|-------------|----------|------|
| **自動保存機能** | 🔄 部分実装 | RT/いいねトリガーによる自動ダウンロード |
| **設定ページ** | 🔄 部分実装 | ファイル名・パス設定UI |
| **ダウンロード履歴** | 🔄 部分実装 | ダウンロード済みファイルの管理 |

### 📋 未実装機能

| 機能カテゴリ | 詳細 |
|-------------|------|
| **TL自動更新抑止** | おすすめ欄や通常TLの自動更新停止 |
| **NativeMessaging** | curl連携による保存方式 |
| **コミケAPI連携** | コミケット情報との連携 |

## 🏗 技術スタック

| 分類 | 内容 |
|------|------|
| プラットフォーム | Chrome 拡張（Manifest v3） |
| 言語 | TypeScript |
| フレームワーク | React |
| ビルド | Webpack |
| UIライブラリ | Mantine |
| データベース | IndexedDB（NoSQL） |
| 状態管理 | `useState`（将来的に Zustand 等導入検討） |
| 画像DL | `chrome.downloads` API / NativeMessaging（curl） |
| パッケージ管理 | Yarn |
| テスト | Jest |
| Lint / Format | ESLint + Prettier |
| Gitフック | Husky |

## 🎨 UI/UX設計

### テーマ対応
- **ライトテーマ**: 白背景、黒文字
- **ダークテーマ**: ダークブルー背景、白文字  
- **ブラックテーマ**: 黒背景、白文字

### ボタン配置
- **CBボタン**: ツイートのアクションバーに追加
- **DLボタン**: メディアツイートのアクションバーに追加
- **サイドバーボタン**: Xサイドバーのブックマーク直後に配置

### ファイル名設定例
```
ディレクトリ: comiketter
ファイル名パターン: {account}-{tweetDate}-{tweetId}-{serial}
結果: comiketter/elonMask/20241201-1145141919810-01.jpg
```

## 📌 補足事項

- NativeMessaging による curl 実行はオプション。デフォルトはchrome.downloads API。
- CBデータ構造は保存形式や参照方式に応じて柔軟に設計。
- UIはX公式に近い見た目を維持し、違和感なく機能を拡張。
- 流用元コードには必ずライセンス表記を維持・追記する。

## 📅 今後の展望

- [ ] CB追加～保存UIの状態遷移図作成
- [ ] DL履歴構造のDB設計
- [ ] コミケAPI連携の仕様リサーチ
- [ ] ファイル名・パス設定機能の完全実装
- [ ] 自動保存機能の完成
- [ ] 設定ページの完成
