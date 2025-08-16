# 動画・画像ダウンロード実装仕様

## 概要

Comiketterでは、動画と画像のダウンロード処理を専用クラスに分離して実装しています。

- **VideoDownloader**: 動画・GIFダウンロード専用
- **ImageDownloader**: 画像ダウンロード専用
- **DownloadManager**: 履歴管理・API処理専用

## 複数メディアファイルの命名規則

### 概要
1つのツイートに複数のメディアファイル（画像・動画）が含まれている場合、ファイル名の重複を避けるため、各ファイルにシリアル番号が自動的に付与されます。

### シリアル番号の付与規則

#### 1. 基本ルール
- **シリアル番号**: `{serial}`トークンを使用
- **形式**: 2桁のゼロパディング（例: `01`, `02`, `03`...）
- **順序**: ツイート内のメディアの出現順

#### 2. ファイル名パターン例
```
デフォルトパターン: {account}-{tweetId}-{serial}
例: elonMask-1145141919810-01.jpg
例: elonMask-1145141919810-02.jpg
例: elonMask-1145141919810-03.mp4
```

#### 3. 複数メディア対応の実装
```typescript
// メディア配列を順次処理し、シリアル番号を割り当て
const mediaItems = this.extractAllMedia(cachedTweet);
const downloadResults = await Promise.allSettled(
  mediaItems.map((media, index) => {
    const mediaFile: TweetMediaFileProps = {
      // ... その他のプロパティ
      serial: index + 1, // 1から始まるシリアル番号
    };
    return this.downloadSingleMedia(media, cachedTweet, settings);
  })
);
```

#### 4. 命名例
**ツイート内容**: 画像3枚 + 動画1本の場合
```
elonMask-1145141919810-01.jpg  // 1枚目の画像
elonMask-1145141919810-02.jpg  // 2枚目の画像
elonMask-1145141919810-03.jpg  // 3枚目の画像
elonMask-1145141919810-04.mp4  // 動画
```

#### 5. カスタムパターン例
```
パターン: {account}_{serial}_{tweetId}
結果: elonMask_01_1145141919810.jpg
結果: elonMask_02_1145141919810.jpg

パターン: {date}_{serial}_{hash}
結果: 20241201_01_abc123.jpg
結果: 20241201_02_def456.jpg
```

### 注意事項

#### 1. シリアル番号の必須性
- 複数メディアがある場合、`{serial}`トークンは必須
- シリアル番号がない場合、ファイル名が重複して上書きされる可能性

#### 2. 順序の保証
- メディアの順序はツイート内での出現順に基づく
- X APIのレスポンス順序に依存

#### 3. ファイル拡張子
- 画像: `.jpg`, `.png`, `.gif`, `.webp`
- 動画: `.mp4`
- 拡張子は自動判定

### 実装詳細

#### 1. シリアル番号生成
```typescript
// FilenameGenerator.makeFilename()内で処理
.replace(PatternToken.Serial, String(serial).padStart(2, '0'))
```

#### 2. メディア抽出時の順序保持
```typescript
private extractAllMedia(tweet: ProcessedTweet): ProcessedMedia[] {
  const media: ProcessedMedia[] = [];
  
  // 画像を順次追加
  if (tweet.extended_entities?.media) {
    tweet.extended_entities.media.forEach(item => {
      if (item.type === 'photo') {
        media.push({ type: 'photo', ...item });
      } else if (item.type === 'video' || item.type === 'animated_gif') {
        media.push({ type: item.type, ...item });
      }
    });
  }
  
  return media; // 順序を保持
}
```

#### 3. ダウンロード処理
```typescript
// 各メディアにシリアル番号を割り当ててダウンロード
mediaItems.forEach((media, index) => {
  const serial = index + 1;
  // ダウンロード処理...
});
```

## アーキテクチャ

### 1. 責任の分離

| クラス | 責任 | 対象 |
|--------|------|------|
| `VideoDownloader` | 動画・GIFダウンロード | 動画・GIFのみ |
| `ImageDownloader` | 画像ダウンロード | 画像のみ |
| `DownloadManager` | 履歴管理・API処理 | 共通処理 |

### 2. データフロー

```
Content Script → MessageHandler → VideoDownloader/ImageDownloader → Chrome Downloads API
                                    ↓
                              StorageManager (履歴保存)
                                    ↓
                              ApiCacheManager (キャッシュ)
```

## VideoDownloader

### 主要機能

1. **キャッシュからのツイート取得**: `ApiCacheManager.findTweetById()`
2. **動画メディア抽出**: `type === 'video' || type === 'animated_gif'`
3. **最高ビットレート選択**: `response-processing-rule.md`準拠
4. **Chrome Downloads API**: ファイルダウンロード実行
5. **履歴保存**: `StorageManager.addDownloadHistory()`

### 実装詳細

#### 最高ビットレート選択ロジック
```typescript
// response-processing-rule.mdに基づいて実装
const bestVariant = mp4Variants.reduce((best, current) => {
  const bestBitrate = best.bitrate || 0;
  const currentBitrate = current.bitrate || 0;
  return currentBitrate > bestBitrate ? current : best;
});
```

#### 対応メディアタイプ
- `video`: 通常の動画
- `animated_gif`: アニメーションGIF

## ImageDownloader

### 主要機能

1. **キャッシュからのツイート取得**: `ApiCacheManager.findTweetById()`
2. **画像メディア抽出**: `type === 'photo'`
3. **画像フィルタリング**: サムネイル・プロフィール画像除外
4. **Chrome Downloads API**: ファイルダウンロード実行
5. **履歴保存**: `StorageManager.addDownloadHistory()`

### 実装詳細

#### 画像フィルタリング
```typescript
// サムネイル画像を除外
if (this.isThumbnailImage(url)) {
  return null;
}

// プロフィール画像やバナー画像を除外
if (this.isProfileOrBannerImage(url)) {
  return null;
}
```

#### 対応画像形式
- JPG/JPEG
- PNG
- GIF
- WebP

## DownloadManager

### 主要機能

1. **API処理**: `ApiProcessor.processApiResponse()`
2. **履歴管理**: ダウンロード履歴のCRUD操作
3. **設定管理**: アプリケーション設定の管理
4. **ダウンロード状態監視**: Chrome Downloads APIの状態変更監視

### 移行状況

| 機能 | 移行先 | 状況 |
|------|--------|------|
| 動画ダウンロード | VideoDownloader | ✅ 完了 |
| 画像ダウンロード | ImageDownloader | ✅ 完了 |
| 履歴管理 | DownloadManager | ✅ 維持 |
| API処理 | DownloadManager | ✅ 維持 |

## MessageHandler

### メッセージ処理

```typescript
switch (message.type) {
  case 'DOWNLOAD_VIDEO':
    await this.handleDownloadVideo(message.payload, sendResponse);
    break;
  case 'DOWNLOAD_IMAGE':
    await this.handleDownloadImage(message.payload, sendResponse);
    break;
  // その他のメッセージ...
}
```

### 統合ポイント

- **VideoDownloader**: 動画ダウンロード要求の処理
- **ImageDownloader**: 画像ダウンロード要求の処理
- **DownloadManager**: 履歴管理・API処理

## API仕様

### VideoDownloadRequest
```typescript
interface VideoDownloadRequest {
  tweetId: string;
  screenName?: string;
}
```

### ImageDownloadRequest
```typescript
interface ImageDownloadRequest {
  tweetId: string;
  screenName?: string;
}
```

### 共通レスポンス形式
```typescript
interface DownloadResult {
  success: boolean;
  error?: string;
  downloadedFiles?: string[];
  tweetInfo?: {
    id: string;
    author: string;
    content: string;
    date: string;
  };
}
```

## 使用方法

### 動画ダウンロード
```typescript
const videoDownloader = new VideoDownloader();
const result = await videoDownloader.downloadVideo({
  tweetId: '1234567890'
});
```

### 画像ダウンロード
```typescript
const imageDownloader = new ImageDownloader();
const result = await imageDownloader.downloadImages({
  tweetId: '1234567890'
});
```

## エラーケース

### VideoDownloader
- キャッシュにツイートが見つからない
- 動画メディアが含まれていない
- 設定を取得できない
- Chrome Downloads APIエラー

### ImageDownloader
- キャッシュにツイートが見つからない
- 画像メディアが含まれていない
- 設定を取得できない
- Chrome Downloads APIエラー

## テスト

### VideoDownloader
- `src/test/video-downloader.test.ts`
- 動画メディア抽出テスト
- 最高ビットレート選択テスト
- ダウンロード実行テスト

### ImageDownloader
- `src/test/image-downloader.test.ts`
- 画像メディア抽出テスト
- 画像フィルタリングテスト
- ダウンロード実行テスト

## 今後の拡張

### 予定機能
1. **並列ダウンロード**: 複数ファイルの同時ダウンロード
2. **進捗表示**: ダウンロード進捗のUI表示
3. **再試行機能**: 失敗時の自動再試行
4. **品質選択**: ユーザーによる品質選択オプション

### 技術的改善
1. **キャッシュ最適化**: メモリ使用量の最適化
2. **エラーハンドリング**: より詳細なエラー情報
3. **パフォーマンス**: ダウンロード速度の向上
4. **セキュリティ**: ダウンロードURLの検証強化

## 実装完了状況

### ✅ 複数メディアファイル命名規則対応（完了）

#### 実装内容
- **MediaDownloader**: 複数メディアのシリアル番号自動割り当て
- **VideoDownloader**: 複数動画のシリアル番号自動割り当て  
- **ImageDownloader**: 複数画像のシリアル番号自動割り当て
- **FilenameGenerator**: シリアル番号の2桁ゼロパディング対応
- **テスト**: 複数メディア命名規則のテストケース追加

#### 修正ファイル
- `src/downloaders/media-downloader.ts`
- `src/downloaders/video-downloader.ts`
- `src/downloaders/image-downloader.ts`
- `src/test/filenameGenerator.test.ts`
- `docs/download-implementation.md`

#### 動作確認
- 複数メディアファイルの自動シリアル番号付与
- ファイル名重複の防止
- 2桁ゼロパディング（01, 02, 03...）
- カスタムパターンでのシリアル番号対応
- テストケース全20件通過 