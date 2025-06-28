# Comiketter

コミックマーケット（コミケ）参加者向けX（旧Twitter）専用Chrome拡張機能

## 機能

- タイムラインの自動更新抑止
- カスタムブックマーク（CB）管理
- 画像・動画の自動保存
- 保存済みツイート一覧の表示
- コミケ参加者の収集・整理・参照体験向上

## 開発環境

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
```

### 技術スタック

- **プラットフォーム**: Chrome拡張（Manifest v3）
- **言語**: TypeScript
- **フレームワーク**: React
- **ビルド**: Webpack
- **UIライブラリ**: Mantine
- **データベース**: IndexedDB（NoSQL）
- **テスト**: Jest
- **Lint/Format**: ESLint + Prettier

## プロジェクト構造

```
src/
├── contentScript/     # ContentScript関連
├── background/        # Background script関連
├── popup/            # ポップアップUI
├── options/          # 設定画面UI
├── utils/            # ユーティリティ関数
├── types/            # 型定義
├── components/       # Reactコンポーネント
├── hooks/            # React hooks
├── stores/           # 状態管理
└── test/             # テスト関連
```

## 開発順序

1. 環境構築 ✅
2. API傍受機能の実装
3. ダウンロード処理の実装
4. DB構築
5. ブックマーク処理
6. ブックマークしたツイートの表示

## ライセンス

MIT License

## 注意事項

- TwitterMediaHarvestから流用する際は、該当ソースの先頭や修正箇所にライセンス表記を必ず記載すること
- 保存方式はchrome.downloads API（デフォルト）とNativeMessaging+curl（オプション）両対応
- CBデータ構造は保存形式や参照方式に応じて柔軟に設計 