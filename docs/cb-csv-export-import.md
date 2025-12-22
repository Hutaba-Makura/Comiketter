# CBリスト CSVエクスポート/インポート仕様

## 概要

このドキュメントは、ComiketterのCB（Custom Bookmark）リストをCSV形式でエクスポート・インポートする機能の仕様を定義します。

## 目的

- 単一のCBリストをCSV形式でエクスポート
- 複数のCBリストを単一のCSVファイルとしてエクスポート
- CSVファイルからCBリストをインポート
- データのバックアップ・復元
- データの移行・共有

## CSV形式の定義

### 基本方針

1. **フラット構造**: 各ツイート行にCBリスト情報を含める形式を採用
2. **UTF-8 BOM付き**: Excel等で正しく日本語を表示するため、UTF-8 BOM付きで保存
3. **カンマ区切り**: 標準的なCSV形式（カンマ区切り）
4. **ダブルクォートエスケープ**: フィールド内のカンマ、改行、ダブルクォートは適切にエスケープ

### CSVヘッダー行

```csv
CB_ID,CB_NAME,CB_DESCRIPTION,CB_CREATED_AT,CB_UPDATED_AT,TWEET_ID,AUTHOR_USERNAME,AUTHOR_DISPLAY_NAME,AUTHOR_ID,AUTHOR_PROFILE_IMAGE_URL,CONTENT,TWEET_DATE,SAVED_AT,IS_RETWEET,IS_REPLY,REPLY_TO_TWEET_ID,REPLY_TO_USERNAME,FAVORITE_COUNT,RETWEET_COUNT,REPLY_COUNT,MEDIA_URLS,MEDIA_TYPES,MEDIA_PREVIEW_URLS,SAVE_TYPE
```

### フィールド定義

| フィールド名 | 型 | 説明 | 必須 |
|------------|-----|------|------|
| CB_ID | string | CBリストの一意ID | ✓ |
| CB_NAME | string | CBリストの名前 | ✓ |
| CB_DESCRIPTION | string | CBリストの説明（空の場合は空文字列） | - |
| CB_CREATED_AT | string | CBリストの作成日時（ISO 8601形式） | ✓ |
| CB_UPDATED_AT | string | CBリストの更新日時（ISO 8601形式） | ✓ |
| TWEET_ID | string | ツイートID | ✓ |
| AUTHOR_USERNAME | string | 投稿者のユーザー名（@なし） | ✓ |
| AUTHOR_DISPLAY_NAME | string | 投稿者の表示名 | - |
| AUTHOR_ID | string | 投稿者のID | - |
| AUTHOR_PROFILE_IMAGE_URL | string | 投稿者のプロフィール画像URL | - |
| CONTENT | string | ツイート本文 | ✓ |
| TWEET_DATE | string | ツイート投稿日時（ISO 8601形式） | ✓ |
| SAVED_AT | string | ブックマーク保存日時（ISO 8601形式） | ✓ |
| IS_RETWEET | boolean | リツイートかどうか（"true"または"false"） | ✓ |
| IS_REPLY | boolean | リプライかどうか（"true"または"false"） | ✓ |
| REPLY_TO_TWEET_ID | string | リプライ先のツイートID | - |
| REPLY_TO_USERNAME | string | リプライ先のユーザー名 | - |
| FAVORITE_COUNT | number | いいね数 | - |
| RETWEET_COUNT | number | リツイート数 | - |
| REPLY_COUNT | number | リプライ数 | - |
| MEDIA_URLS | string | メディアURLの配列（JSON配列形式、またはパイプ区切り） | - |
| MEDIA_TYPES | string | メディアタイプの配列（JSON配列形式、またはパイプ区切り） | - |
| MEDIA_PREVIEW_URLS | string | メディアプレビューURLの配列（JSON配列形式、またはパイプ区切り） | - |
| SAVE_TYPE | string | 保存タイプ（"url"、"blob"、"mixed"） | ✓ |

### 配列フィールドのエンコード方式

配列フィールド（MEDIA_URLS、MEDIA_TYPES、MEDIA_PREVIEW_URLS）は、以下の2つの方式をサポートします：

1. **JSON配列形式（推奨）**: `["url1","url2"]` のようにJSON配列としてエンコード
2. **パイプ区切り形式**: `url1|url2` のようにパイプ（`|`）で区切る

インポート時は、両方の形式を認識できるようにします。

### CSVサンプル

```csv
CB_ID,CB_NAME,CB_DESCRIPTION,CB_CREATED_AT,CB_UPDATED_AT,TWEET_ID,AUTHOR_USERNAME,AUTHOR_DISPLAY_NAME,AUTHOR_ID,AUTHOR_PROFILE_IMAGE_URL,CONTENT,TWEET_DATE,SAVED_AT,IS_RETWEET,IS_REPLY,REPLY_TO_TWEET_ID,REPLY_TO_USERNAME,FAVORITE_COUNT,RETWEET_COUNT,REPLY_COUNT,MEDIA_URLS,MEDIA_TYPES,MEDIA_PREVIEW_URLS,SAVE_TYPE
cb_001,サンプルCB,これはサンプルです,2024-01-01T00:00:00.000Z,2024-01-15T12:30:00.000Z,1234567890,user1,ユーザー1,user_id_1,https://example.com/profile.jpg,これはサンプルツイートです,2024-01-10T10:00:00.000Z,2024-01-10T10:05:00.000Z,false,false,,,,10,5,2,["https://example.com/image1.jpg"],["photo"],["https://example.com/preview1.jpg"],url
cb_001,サンプルCB,これはサンプルです,2024-01-01T00:00:00.000Z,2024-01-15T12:30:00.000Z,1234567891,user2,ユーザー2,user_id_2,https://example.com/profile2.jpg,リプライのサンプル,2024-01-11T11:00:00.000Z,2024-01-11T11:05:00.000Z,false,true,1234567890,user1,,3,1,["https://example.com/image2.jpg","https://example.com/image3.jpg"],["photo","photo"],["https://example.com/preview2.jpg","https://example.com/preview3.jpg"],url
cb_002,別のCB,説明なし,2024-01-02T00:00:00.000Z,2024-01-16T13:00:00.000Z,1234567892,user3,ユーザー3,user_id_3,,シンプルなツイート,2024-01-12T12:00:00.000Z,2024-01-12T12:05:00.000Z,false,false,,,,0,0,0,,,,url
```

## エクスポート機能

### 機能要件

1. **単一CBリストのエクスポート**
   - 指定されたCBリストとそのツイートをCSV形式でエクスポート
   - ファイル名: `{CB名}_export_{日時}.csv`（例: `サンプルCB_export_20240115_123000.csv`）

2. **全CBリストのエクスポート**
   - 全てのCBリストとそのツイートを単一のCSVファイルとしてエクスポート
   - ファイル名: `all_cb_lists_export_{日時}.csv`（例: `all_cb_lists_export_20240115_123000.csv`）

3. **選択CBリストのエクスポート**
   - ユーザーが選択した複数のCBリストを単一のCSVファイルとしてエクスポート
   - ファイル名: `selected_cb_lists_export_{日時}.csv`

### 実装方針

#### エクスポート処理フロー

```
1. エクスポート対象のCBリストIDを取得
   ↓
2. 各CBリストの情報を取得（BookmarkDB）
   ↓
3. 各CBリストに紐づくツイートを取得（BookmarkedTweetDB）
   ↓
4. CSVヘッダー行を生成
   ↓
5. 各ツイート行を生成（CBリスト情報 + ツイート情報）
   ↓
6. 配列フィールドをJSON配列形式にエンコード
   ↓
7. CSV文字列を生成（UTF-8 BOM付き）
   ↓
8. Blobオブジェクトを作成
   ↓
9. ダウンロードリンクを作成して自動ダウンロード
```

#### データ変換ルール

1. **日時フォーマット**: ISO 8601形式（`YYYY-MM-DDTHH:mm:ss.SSSZ`）
2. **真偽値**: `true` / `false` を文字列として出力
3. **空値**: 空文字列として出力
4. **配列**: JSON配列形式でエンコード（例: `["value1","value2"]`）
5. **特殊文字**: CSVの標準ルールに従ってエスケープ
   - フィールド内のカンマ、改行、ダブルクォートは適切にエスケープ
   - フィールド全体をダブルクォートで囲む

## インポート機能

### 機能要件

1. **CSVファイルの読み込み**
   - ファイル選択ダイアログからCSVファイルを選択
   - UTF-8 BOM付き/なしの両方に対応

2. **データの検証**
   - 必須フィールドの存在確認
   - データ型の検証
   - 日時形式の検証

3. **インポート方式の選択**
   - **新規作成**: 既存のCBリストと重複しないように新規作成
   - **上書き**: 同じCB_IDが存在する場合は上書き
   - **マージ**: 既存のCBリストにツイートを追加（重複ツイートはスキップ）

4. **インポート結果の表示**
   - 成功したCBリスト数
   - 成功したツイート数
   - エラーが発生した行の情報

### 実装方針

#### インポート処理フロー

```
1. CSVファイルを読み込み
   ↓
2. UTF-8 BOMを除去（存在する場合）
   ↓
3. CSVをパース（ヘッダー行を取得）
   ↓
4. 各行を順次処理
   ↓
5. データ検証
   - 必須フィールドの確認
   - データ型の変換・検証
   - 配列フィールドのデコード
   ↓
6. CBリスト情報を抽出・集約
   ↓
7. インポート方式に応じて処理
   - 新規作成: 新しいCBリストを作成
   - 上書き: 既存のCBリストを更新
   - マージ: 既存のCBリストにツイートを追加
   ↓
8. ツイートをCBリストに追加
   ↓
9. 結果を集計・表示
```

#### データ変換ルール

1. **日時**: ISO 8601形式からDateオブジェクトに変換
2. **真偽値**: 文字列 `"true"` / `"false"` をbooleanに変換
3. **数値**: 文字列から数値に変換（空の場合はundefined）
4. **配列**: JSON配列形式またはパイプ区切り形式から配列に変換
5. **空値**: 空文字列はundefinedに変換

#### エラーハンドリング

1. **ファイル読み込みエラー**: エラーメッセージを表示
2. **CSVパースエラー**: エラー行をスキップして続行、エラー情報を記録
3. **データ検証エラー**: エラー行をスキップして続行、エラー情報を記録
4. **データベースエラー**: エラーメッセージを表示、部分的なインポート結果を表示

## 実装場所

### ファイル構成

```
src/bookmarks/
├── services/
│   ├── cbCsvExportService.ts    # CSVエクスポートサービス
│   └── cbCsvImportService.ts    # CSVインポートサービス
├── utils/
│   └── csvParser.ts             # CSVパーサー（共通）
└── components/
    └── CbImportModal.tsx        # インポート用モーダルコンポーネント
```

### サービスインターフェース

#### cbCsvExportService.ts

```typescript
/**
 * CBリストをCSV形式でエクスポートするサービス
 */
export class CbCsvExportService {
  /**
   * 単一のCBリストをエクスポート
   */
  async exportSingleCb(cbId: string): Promise<void>;

  /**
   * 複数のCBリストをエクスポート
   */
  async exportMultipleCbs(cbIds: string[]): Promise<void>;

  /**
   * 全てのCBリストをエクスポート
   */
  async exportAllCbs(): Promise<void>;

  /**
   * CBリストデータをCSV文字列に変換
   */
  private convertToCsv(cbData: CbExportData[]): string;

  /**
   * 配列をJSON配列形式の文字列に変換
   */
  private encodeArrayField(array: string[] | undefined): string;

  /**
   * CSVフィールドをエスケープ
   */
  private escapeCsvField(field: string): string;
}
```

#### cbCsvImportService.ts

```typescript
/**
 * CSVファイルからCBリストをインポートするサービス
 */
export class CbCsvImportService {
  /**
   * CSVファイルをインポート
   */
  async importFromFile(
    file: File,
    mode: 'create' | 'overwrite' | 'merge'
  ): Promise<ImportResult>;

  /**
   * CSV文字列をパース
   */
  private parseCsv(csvText: string): CsvRow[];

  /**
   * 配列フィールドをデコード
   */
  private decodeArrayField(field: string): string[];

  /**
   * データ行を検証
   */
  private validateRow(row: CsvRow): ValidationResult;

  /**
   * CBリストデータを集約
   */
  private aggregateCbData(rows: CsvRow[]): Map<string, CbImportData>;
}
```

## 型定義

### エクスポート用型

```typescript
/**
 * エクスポート用のCBデータ
 */
export interface CbExportData {
  cb: {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  tweets: BookmarkedTweetDB[];
}

/**
 * CSV行データ
 */
export interface CsvRow {
  [key: string]: string;
}
```

### インポート用型

```typescript
/**
 * インポート用のCBデータ
 */
export interface CbImportData {
  cb: {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  tweets: BookmarkedTweetImportData[];
}

/**
 * インポート用のツイートデータ
 */
export interface BookmarkedTweetImportData {
  tweetId: string;
  authorUsername: string;
  authorDisplayName?: string;
  authorId?: string;
  authorProfileImageUrl?: string;
  content: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  mediaPreviewUrls?: string[];
  tweetDate: string;
  savedAt: string;
  isRetweet: boolean;
  isReply: boolean;
  replyToTweetId?: string;
  replyToUsername?: string;
  favoriteCount?: number;
  retweetCount?: number;
  replyCount?: number;
  saveType: 'url' | 'blob' | 'mixed';
}

/**
 * インポート結果
 */
export interface ImportResult {
  success: boolean;
  importedCbCount: number;
  importedTweetCount: number;
  skippedTweetCount: number;
  errors: ImportError[];
}

/**
 * インポートエラー
 */
export interface ImportError {
  rowNumber: number;
  message: string;
  data?: Partial<CsvRow>;
}
```

## 注意事項

### データの整合性

1. **CB_IDの一意性**: インポート時に既存のCB_IDと重複する場合の処理を明確にする
2. **ツイートの重複**: 同じCBリスト内で同じツイートIDが複数存在する場合は、最新のデータを優先
3. **日時の整合性**: CB_UPDATED_ATは、ツイートの追加・更新時に自動的に更新される

### パフォーマンス

1. **大量データの処理**: 大量のツイートを含むCSVファイルの場合、チャンク処理を検討
2. **メモリ使用量**: 大きなCSVファイルを一度にメモリに読み込まないようにする

### セキュリティ

1. **ファイルサイズ制限**: 過度に大きなファイルのインポートを制限
2. **データ検証**: 悪意のあるデータの注入を防ぐため、厳密なデータ検証を実施

## 将来の拡張

1. **JSON形式のサポート**: CSVに加えてJSON形式でのエクスポート/インポート
2. **部分エクスポート**: 特定の条件に一致するツイートのみをエクスポート
3. **スケジュールエクスポート**: 定期的な自動バックアップ
4. **クラウド連携**: Google Drive、Dropbox等への直接エクスポート

