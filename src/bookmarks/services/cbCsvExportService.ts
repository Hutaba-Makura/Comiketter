/**
 * CBリストをCSV形式でエクスポートするサービス
 */

import { bookmarkDB, BookmarkDB, BookmarkedTweetDB } from '../../utils/bookmarkDB';
import { escapeCsvField, encodeArrayField } from '../utils/csvParser';

/**
 * エクスポート用のCBデータ
 */
export interface CbExportData {
  cb: BookmarkDB;
  tweets: BookmarkedTweetDB[];
}

/**
 * CSVエクスポートサービス
 */
export class CbCsvExportService {
  /**
   * CSVヘッダー行を生成
   */
  private generateHeader(): string {
    const headers = [
      'CB_ID',
      'CB_NAME',
      'CB_DESCRIPTION',
      'CB_CREATED_AT',
      'CB_UPDATED_AT',
      'TWEET_ID',
      'AUTHOR_USERNAME',
      'AUTHOR_DISPLAY_NAME',
      'AUTHOR_ID',
      'AUTHOR_PROFILE_IMAGE_URL',
      'CONTENT',
      'TWEET_DATE',
      'SAVED_AT',
      'IS_RETWEET',
      'IS_REPLY',
      'REPLY_TO_TWEET_ID',
      'REPLY_TO_USERNAME',
      'FAVORITE_COUNT',
      'RETWEET_COUNT',
      'REPLY_COUNT',
      'MEDIA_URLS',
      'MEDIA_TYPES',
      'MEDIA_PREVIEW_URLS',
      'SAVE_TYPE'
    ];

    return headers.map(escapeCsvField).join(',');
  }

  /**
   * ツイート行を生成
   */
  private generateTweetRow(cb: BookmarkDB, tweet: BookmarkedTweetDB): string {
    const fields = [
      escapeCsvField(cb.id),
      escapeCsvField(cb.name),
      escapeCsvField(cb.description || ''),
      escapeCsvField(cb.createdAt),
      escapeCsvField(cb.updatedAt),
      escapeCsvField(tweet.tweetId),
      escapeCsvField(tweet.authorUsername),
      escapeCsvField(tweet.authorDisplayName || ''),
      escapeCsvField(tweet.authorId || ''),
      escapeCsvField(tweet.authorProfileImageUrl || ''),
      escapeCsvField(tweet.content),
      escapeCsvField(tweet.tweetDate),
      escapeCsvField(tweet.savedAt),
      escapeCsvField(tweet.isRetweet ? 'true' : 'false'),
      escapeCsvField(tweet.isReply ? 'true' : 'false'),
      escapeCsvField(tweet.replyToTweetId || ''),
      escapeCsvField(tweet.replyToUsername || ''),
      escapeCsvField(tweet.favoriteCount ?? ''),
      escapeCsvField(tweet.retweetCount ?? ''),
      escapeCsvField(tweet.replyCount ?? ''),
      escapeCsvField(encodeArrayField(tweet.mediaUrls)),
      escapeCsvField(encodeArrayField(tweet.mediaTypes)),
      escapeCsvField(encodeArrayField(tweet.mediaPreviewUrls)),
      escapeCsvField(tweet.saveType)
    ];

    return fields.join(',');
  }

  /**
   * CBデータをCSV文字列に変換
   */
  private convertToCsv(cbDataList: CbExportData[]): string {
    const lines: string[] = [];

    // ヘッダー行
    lines.push(this.generateHeader());

    // データ行
    for (const cbData of cbDataList) {
      for (const tweet of cbData.tweets) {
        lines.push(this.generateTweetRow(cbData.cb, tweet));
      }
    }

    return lines.join('\n');
  }

  /**
   * CSV文字列をBlobに変換してダウンロード
   */
  private downloadCsv(csvContent: string, filename: string): void {
    // UTF-8 BOMを追加
    const bom = '\uFEFF';
    const blob = new window.Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

    // ダウンロードリンクを作成
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    // クリックしてダウンロード
    document.body.appendChild(link);
    link.click();

    // クリーンアップ
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * ファイル名を生成
   */
  private generateFilename(prefix: string): string {
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${prefix}_${dateStr}.csv`;
  }

  /**
   * 単一のCBリストをエクスポート
   */
  async exportSingleCb(cbId: string): Promise<void> {
    try {
      // CB情報を取得
      const cb = await bookmarkDB.getBookmarkById(cbId);
      if (!cb) {
        throw new Error(`CBが見つかりません: ${cbId}`);
      }

      // ツイートを取得
      const tweets = await bookmarkDB.getBookmarkedTweetsByBookmarkId(cbId);

      // CSVに変換
      const csvContent = this.convertToCsv([{ cb, tweets }]);

      // ファイル名を生成（CB名から特殊文字を除去）
      const safeName = cb.name.replace(/[<>:"/\\|?*]/g, '_');
      const filename = this.generateFilename(`${safeName}_export`);

      // ダウンロード
      this.downloadCsv(csvContent, filename);
    } catch (error) {
      console.error('CBエクスポートエラー:', error);
      throw error;
    }
  }

  /**
   * 複数のCBリストをエクスポート
   */
  async exportMultipleCbs(cbIds: string[]): Promise<void> {
    try {
      const cbDataList: CbExportData[] = [];

      // 各CBのデータを取得
      for (const cbId of cbIds) {
        const cb = await bookmarkDB.getBookmarkById(cbId);
        if (!cb) {
          console.warn(`CBが見つかりません: ${cbId}`);
          continue;
        }

        const tweets = await bookmarkDB.getBookmarkedTweetsByBookmarkId(cbId);
        cbDataList.push({ cb, tweets });
      }

      if (cbDataList.length === 0) {
        throw new Error('エクスポートするCBが見つかりません');
      }

      // CSVに変換
      const csvContent = this.convertToCsv(cbDataList);

      // ファイル名を生成
      const filename = cbIds.length === 1
        ? this.generateFilename('cb_export')
        : this.generateFilename('selected_cb_lists_export');

      // ダウンロード
      this.downloadCsv(csvContent, filename);
    } catch (error) {
      console.error('CBエクスポートエラー:', error);
      throw error;
    }
  }

  /**
   * 全てのCBリストをエクスポート
   */
  async exportAllCbs(): Promise<void> {
    try {
      // 全てのCBを取得
      const cbs = await bookmarkDB.getAllBookmarks();
      
      if (cbs.length === 0) {
        throw new Error('エクスポートするCBが見つかりません');
      }

      const cbDataList: CbExportData[] = [];

      // 各CBのツイートを取得
      for (const cb of cbs) {
        const tweets = await bookmarkDB.getBookmarkedTweetsByBookmarkId(cb.id);
        cbDataList.push({ cb, tweets });
      }

      // CSVに変換
      const csvContent = this.convertToCsv(cbDataList);

      // ファイル名を生成
      const filename = this.generateFilename('all_cb_lists_export');

      // ダウンロード
      this.downloadCsv(csvContent, filename);
    } catch (error) {
      console.error('CBエクスポートエラー:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const cbCsvExportService = new CbCsvExportService();

