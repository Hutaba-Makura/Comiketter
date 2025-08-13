# Comiketter

コミックマーケット（コミケ）参加者向けX（旧Twitter）専用Chrome拡張機能

## 🚀 機能

### ✅ 実装済み機能

- **タイムライン自動更新抑止**: コミケ参加者の収集・整理・参照体験向上
- **カスタムブックマーク（CB）管理**: 柔軟なブックマーク分類と管理
- **画像・動画の自動保存**: TwitterMediaHarvest準拠のメディアダウンロード
- **動画サムネイル除外機能**: 不要なサムネイル画像の除外
- **プロフィール画像・バナー画像除外機能**: メディアの自動除外設定
- **保存済みツイート一覧表示**: ダウンロード履歴の管理・参照
- **ファイル名・パス設定機能**: 13種類のパターントークン対応
- **API傍受機能**: X APIの自動傍受とキャッシュ
- **ダウンロード履歴管理**: IndexedDBベースの履歴管理

### 🔧 技術的特徴

- **Manifest v3対応**: 最新のChrome拡張機能仕様
- **TypeScript**: 型安全性の確保
- **React + Mantine**: モダンなUI/UX
- **IndexedDB**: 高性能なローカルデータベース
- **Jest**: 包括的なテスト環境

## 🛠️ 開発環境

### 必要条件

- Node.js 18.0.0以上
- Yarn 1.22.0以上

### セットアップ

```bash
# 依存関係のインストール
yarn install

# 開発ビルド
yarn build:dev

# 本番ビルド
yarn build:prod

# ウォッチモード（開発中）
yarn watch

# テスト実行
yarn test

# リント実行
yarn lint

# コードフォーマット
yarn format

# 型チェック
yarn type-check
```

### 技術スタック

| 分類 | 技術 | バージョン | 用途 |
|------|------|-----------|------|
| **プラットフォーム** | Chrome Extension | Manifest v3 | 拡張機能基盤 |
| **言語** | TypeScript | 5.2+ | メイン開発言語 |
| **フレームワーク** | React | 18.2+ | UI構築 |
| **ビルドツール** | Webpack | 5.89+ | バンドル・ビルド |
| **UIライブラリ** | Mantine | 7.2+ | コンポーネントライブラリ |
| **データベース** | IndexedDB | - | ローカルデータ保存 |
| **テスト** | Jest | 29.7+ | ユニットテスト |
| **Lint/Format** | ESLint + Prettier | 8.53+ | コード品質管理 |
| **Gitフック** | Husky | 8.0+ | コミット前チェック |

## 📁 プロジェクト構造

```
src/
├── api-processor/     # API処理・メディア抽出
│   ├── api-processor.ts
│   ├── media-extractor.ts
│   └── index.ts
├── background/        # バックグラウンドスクリプト
│   ├── index.ts
│   ├── downloadManager.ts
│   └── downloadTestManager.ts
├── bookmarks/         # ブックマークページ
│   ├── BookmarkPage.tsx
│   ├── BookmarkList.tsx
│   ├── BookmarkDetail.tsx
│   └── index.tsx
├── components/        # 再利用可能なUIコンポーネント
│   ├── BookmarkSelector.tsx
│   ├── BookmarkManager.tsx
│   ├── DownloadHistoryManager.tsx
│   └── FilenameSettings.tsx
├── contentScript/     # コンテンツスクリプト
│   ├── index.ts
│   ├── apiInterceptor.ts
│   ├── sidebarButton.ts
│   └── buttonManager/
│       ├── baseButton.ts
│       ├── bookmarkButton.ts
│       ├── buttonFactory.ts
│       └── index.ts
├── downloaders/       # ダウンロード処理
│   ├── image-downloader.ts
│   ├── media-downloader.ts
│   └── index.ts
├── hooks/            # カスタムReactフック
├── options/          # オプションページ
│   ├── index.tsx
│   └── OptionsApp.tsx
├── popup/            # ポップアップページ
│   ├── index.tsx
│   └── PopupApp.tsx
├── stores/           # 状態管理
├── test/             # テストファイル
│   ├── api-cache.test.ts
│   ├── api-processor-all-samples.test.ts
│   ├── downloaders/
│   │   ├── image-downloader.test.ts
│   │   └── video-downloader.test.ts
│   └── ...
├── types/            # 型定義
│   ├── index.ts
│   └── api.d.ts
└── utils/            # ユーティリティ関数
    ├── api-cache.ts
    ├── bookmarkDB.ts
    ├── bookmarkApiClient.ts
    ├── downloadHistoryDB.ts
    ├── filenameGenerator.ts
    ├── storage.ts
    ├── logger.ts
    ├── constants.ts
    └── ...
```

## 📊 開発進捗

### ✅ 完了済み（87%）

- **基盤機能**: 100% 完了
  - TypeScript + React + Webpack環境構築
  - Mantine UIライブラリ導入
  - ESLint + Prettier設定
  - Jest テスト環境構築
  - Husky コミットフック設定
  - Chrome拡張機能マニフェスト設定

- **UI/UX**: 85% 完了
  - options.htmlのUI崩れ修正（Mantine CSS導入）
  - サイドバーボタン挿入位置の最適化
  - サイドバーボタンの閉じない問題修正
  - MutationObserverによる動的監視実装
  - 重複挿入防止のWeakSet管理

- **ダウンロード履歴機能**: 95% 完了
  - IndexedDBベースのDL履歴データベース実装
  - ダウンロード履歴のCRUD操作
  - 統計情報取得機能
  - 検索・フィルタリング機能
  - DL履歴管理UIコンポーネント

- **カスタムブックマーク**: 90% 完了
  - 基本データ構造設計
  - ブックマーク作成・編集・削除機能
  - ツイート保存機能
  - ブックマーク選択UI
  - データ永続化（IndexedDB）

- **API傍受**: 80% 完了
  - X API傍受の基本実装
  - イベント型定義の整備
  - background/contentScript間通信
  - エラーハンドリング
  - メッセージングシステム

- **ファイル名・パス設定機能**: 100% 完了
  - パターントークン13種類の実装
  - ディレクトリ名・ファイル名パターン設定UI
  - リアルタイムプレビュー機能
  - 設定の永続化（IndexedDB）
  - バリデーション機能

- **テスト**: 60% 完了
  - ユニットテスト環境構築
  - API傍受テスト
  - ダウンロード機能テスト
  - データベース操作テスト

- **ドキュメント**: 100% 完了
  - README.md作成・更新
  - タスク一覧作成
  - データフロー図作成
  - ER図作成
  - 実装環境・技術仕様書作成

### 🚧 進行中

- データ移行・統合機能
- UI/UX改善

### 📋 今後の予定

- ダウンロード履歴のエクスポート機能
- バッチダウンロード機能
- 高度な検索機能
- ダークテーマ対応
- 統計分析機能

## 🎯 開発順序

1. ✅ 環境構築
2. ✅ API傍受機能の実装
3. ✅ ダウンロード処理の実装
4. ✅ 動画ダウンロード機能の実装
5. ✅ メディア除外機能の実装
6. ✅ DB構築
7. ✅ ブックマーク処理
8. ✅ ブックマークしたツイートの表示
9. 🔄 データ移行・統合
10. 📋 UI/UX改善

## 📚 関連ドキュメント

- [実装環境・技術仕様](implementation-environments.md)
- [データフロー図](data-flow-diagram.md)
- [ER図](er-diagram.md)
- [API傍受実装](api-cache-implementation.md)
- [ダウンロード実装](download-implementation.md)
- [開発タスク一覧](tasks.md)

## 📄 ライセンス

MIT License

## ⚠️ 注意事項

- TwitterMediaHarvestから流用する際は、該当ソースの先頭や修正箇所にライセンス表記を必ず記載すること
- 保存方式はchrome.downloads API（デフォルト）とNativeMessaging+curl（オプション）両対応
- CBデータ構造は保存形式や参照方式に応じて柔軟に設計
- 型安全性を最優先に考えた実装
- テストは必ず作成する
- パフォーマンスを意識した実装を行う
