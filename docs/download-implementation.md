# 動画・画像ダウンロード実装仕様

## 概要

Comiketterでは、動画と画像のダウンロード処理を専用クラスに分離して実装しています。

- **VideoDownloader**: 動画・GIFダウンロード専用
- **ImageDownloader**: 画像ダウンロード専用
- **DownloadManager**: 履歴管理・API処理専用

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