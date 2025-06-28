# 📘 Comiketter 要件定義書

## 📝 概要
**Comiketter** は、コミックマーケット（コミケ）参加者向けに設計された X（旧Twitter）専用の Chrome 拡張機能です。タイムラインの自動更新の抑止、ツイートのカスタムブックマーク（CB）管理、画像・動画の自動保存、保存済みツイート一覧の表示などを行い、ユーザーの収集・整理・参照体験を向上させます。

## 🗂 ディレクトリ構成と役割一覧

| フォルダ名                | 役割・内容（現状/予定）                                                                 |
|---------------------------|--------------------------------------------------------------------------------------|
| src/contentScript/        | Twitter(X)ページに注入されるメイン処理。API傍受・DOM監視・ボタン追加など               |
| src/background/           | 拡張機能のバックグラウンド処理。APIレスポンス受信・DL管理・DB連携など                 |
| src/popup/                | 拡張機能アイコンのポップアップUI（React/Mantine）。CB一覧・設定画面への導線など         |
| src/options/              | 拡張機能の詳細設定画面（React/Mantine）。保存形式や自動DL条件などの設定UI               |
| src/utils/                | 汎用ユーティリティ関数・ストレージ操作・定数定義など                                   |
| src/types/                | 型定義（TypeScript用）。API傍受・DB・UIなど全体の型管理                                 |
| src/components/           | 再利用可能なReactコンポーネント群（UIパーツ等）                                        |
| src/hooks/                | React用カスタムフック（状態管理・副作用処理など）                                      |
| src/stores/               | 状態管理（将来的にZustand等の導入も想定）                                              |
| src/test/                 | テストコード（Jest/Testing Library等）                                                  |
| icons/                    | 拡張機能アイコン画像（manifestで参照）                                                  |
| docs/                     | 仕様・設計・タスク管理等のドキュメント                                                  |

---

## 🧩 機能要件

### ✅ 基本機能一覧

| 機能カテゴリ | 内容 |
|-------------|------|
| TL自動更新抑止 | おすすめ欄や通常TLが勝手に更新される挙動を停止 |
| カスタムブックマーク（CB） | ツイートに独自のCBボタンを追加。CBは複数作成可能で名前も自由に設定できる（例:「1日目」「絶対行きたい」など） |
| CB選択UI | CBボタン押下でチェックリスト形式のCB一覧が表示され、選択したCBにツイートを追加できる（YouTubeのプレイリスト追加UI風、通常ブックマークの下に配置） |
| CB保存ページ | 拡張機能アイコンやX画面のサイドバーから、保存したCBツイートをTL風デザインで閲覧可能。CB管理（作成・編集・削除）はこの一覧から操作可能 |
| 保存データ形式 | `(画像URL + テキスト)` または `(画像本体 + テキスト)` を設定で選択可能。2種混合の保存データも表示対応 |
| 自動保存機能 | 「RT」「いいね」「RT + いいね」などのアクションをトリガーとして、自動的に画像・動画保存を実行（条件はユーザー設定） |
| 保存方法選択 | 通常の `chrome.downloads` API または `NativeMessaging` 経由の curl 実行による保存方式を選択可能（デフォルトはAPI、curlは.bat等で連携） |
| 保存ディレクトリ構成 | ダウンロード対象ツイート主のXアカウント別・日付別（`YYYY-MM-DD`）で整理されたファイル保存をサポート |
| ダウンロード履歴DB | ダウンロードの記録を CB とは別DBに保存し、ファイル名・保存時刻・URL などを後から参照可能 |
| コミケAPI連携（予定） | 将来的にコミケ公式APIを用いた出展者情報取得・CB自動分類等の機能追加を検討中 |

### 📁 ファイル名・パス設定機能（TwitterMediaHarvest準拠）

#### パターントークン（ファイル名に含める情報）
- `{account}` - アカウント名（screenName）
- `{accountId}` - アカウントID（userId）
- `{tweetId}` - ツイートID
- `{serial}` - シリアル番号（メディアファイルの順番）
- `{hash}` - ハッシュ値
- `{date}` - ダウンロード日付（YYYYMMDD）
- `{datetime}` - ダウンロード日時（YYYYMMDDHHMMSS）
- `{underscoreDatetime}` - ダウンロード日時（YYYYMMDD_HHMMSS）
- `{timestamp}` - ダウンロードタイムスタンプ
- `{tweetDate}` - ツイート投稿日付（YYYYMMDD）
- `{tweetDatetime}` - ツイート投稿日時（YYYYMMDDHHMMSS）
- `{underscroeTweetDatetime}` - ツイート投稿日時（YYYYMMDD_HHMMSS）
- `{tweetTimestamp}` - ツイート投稿タイムスタンプ

#### ディレクトリ設定
- **サブディレクトリ**: 作成/無効化の切り替え
- **ディレクトリ名**: カスタマイズ可能（例: `comiketter`）
- **アカウント別ディレクトリ**: `{account}`でグループ化（例: `comiketter/elonMask/114514.png`）

#### ファイル名パターン設定UI
- **ドラッグ&ドロップ**: トークンの順序変更
- **トグル機能**: トークンの有効/無効切り替え
- **リアルタイムプレビュー**: 設定変更時の即座なファイル名表示
- **設定永続化**: IndexedDBによる設定保存

#### 設定例
```
ディレクトリ: comiketter
ファイル名パターン: {account}-{tweetDate}-{tweetId}-{serial}
結果: comiketter/elonMask/20241201-1145141919810-01.jpg
```

---

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

---

## 📌 補足事項

- NativeMessaging による curl 実行はオプション。デフォルトはchrome.downloads API。curl連携は.bat等で対応。
- 保存ディレクトリの「アカウント別」はダウンロード対象ツイート主のXアカウント基準。
- CBデータ構造は保存形式や参照方式に応じて柔軟に設計（ツイートリンクのみ/全情報保存など）。
- UIはX公式に近い見た目を維持し、違和感なく機能を拡張。CB選択UIはチェックリスト形式で通常ブックマークの下に配置。
- 流用元コードには必ずライセンス表記を維持・追記する。
- 今後、状態遷移図・操作フロー図は Mermaid や Figma を用いて整理予定。

---

## 📅 今後の展望（ToDo）

- [ ] CB追加～保存UIの状態遷移図作成
- [ ] DL履歴構造のDB設計
- [ ] コミケAPI連携の仕様リサーチ
- [ ] API傍受→DL処理→DB構築→ブックマーク処理→ブックマーク表示の順で開発
- [ ] ファイル名・パス設定機能の実装（TwitterMediaHarvest準拠）
