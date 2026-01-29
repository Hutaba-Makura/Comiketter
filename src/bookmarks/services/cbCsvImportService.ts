/**
 * CSVファイルからCBリストをインポートするサービス
 */

import { bookmarkDB, BookmarkDB } from '../../utils/bookmarkDB';
import { parseCsv, decodeArrayField, CsvRow } from '../utils/csvParser';

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

/**
 * インポート方式
 */
export type ImportMode = 'create' | 'overwrite' | 'merge';

/**
 * CSVインポートサービス
 */
export class CbCsvImportService {
  /**
   * 日時文字列をISO 8601形式に変換
   */
  private normalizeDate(dateString: string): string {
    if (!dateString || dateString.trim() === '') {
      return '';
    }

    // 既にISO 8601形式の場合はそのまま返す
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateString)) {
      return dateString;
    }

    // Twitter形式（EEE MMM dd HH:mm:ss ZZZ yyyy）をISO 8601形式に変換
    // 例: "Sun Dec 21 09:01:56 +0000 2025" -> "2025-12-21T09:01:56.000Z"
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // パースに失敗した場合は元の値を返す
        console.warn(`日時のパースに失敗しました: ${dateString}`);
        return dateString;
      }
      return date.toISOString();
    } catch (error) {
      console.warn(`日時の変換エラー: ${dateString}`, error);
      return dateString;
    }
  }

  /**
   * データ行を検証
   */
  private validateRow(row: CsvRow): { valid: boolean; error?: string } {
    // 必須フィールドのチェック
    const requiredFields = [
      'CB_ID',
      'CB_NAME',
      'CB_CREATED_AT',
      'CB_UPDATED_AT',
      'TWEET_ID',
      'AUTHOR_USERNAME',
      'CONTENT',
      'TWEET_DATE',
      'SAVED_AT',
      'IS_RETWEET',
      'IS_REPLY',
      'SAVE_TYPE'
    ];

    for (const field of requiredFields) {
      if (!row[field] || row[field].trim() === '') {
        return {
          valid: false,
          error: `必須フィールドが不足しています: ${field}`
        };
      }
    }

    // 真偽値の検証
    const booleanFields = ['IS_RETWEET', 'IS_REPLY'];
    for (const field of booleanFields) {
      const value = row[field].toLowerCase();
      if (value !== 'true' && value !== 'false') {
        return {
          valid: false,
          error: `真偽値フィールドの形式が不正です: ${field} (値: ${row[field]})`
        };
      }
    }

    // 日時形式の検証（ISO 8601形式またはTwitter形式を許可）
    const dateFields = ['CB_CREATED_AT', 'CB_UPDATED_AT', 'TWEET_DATE', 'SAVED_AT'];
    for (const field of dateFields) {
      const value = row[field];
      if (value) {
        // ISO 8601形式（YYYY-MM-DDTHH:mm:ss.SSSZ）またはTwitter形式（EEE MMM dd HH:mm:ss ZZZ yyyy）を許可
        const isIso8601 = /^\d{4}-\d{2}-\d{2}T/.test(value);
        const isTwitterFormat = /^[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+[+-]\d{4}\s+\d{4}$/.test(value);
        if (!isIso8601 && !isTwitterFormat) {
          return {
            valid: false,
            error: `日時フィールドの形式が不正です: ${field} (値: ${value})`
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * CSV行をインポート用データに変換
   */
  private convertRowToImportData(row: CsvRow): {
    cb: CbImportData['cb'];
    tweet: BookmarkedTweetImportData;
  } {
    // 真偽値の変換
    const parseBoolean = (value: string): boolean => {
      return value.toLowerCase() === 'true';
    };

    // 数値の変換
    const parseNumber = (value: string): number | undefined => {
      if (!value || value.trim() === '') {
        return undefined;
      }
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    };

    const cb: CbImportData['cb'] = {
      id: row['CB_ID'].trim(),
      name: row['CB_NAME'].trim(),
      description: row['CB_DESCRIPTION']?.trim() || undefined,
      createdAt: this.normalizeDate(row['CB_CREATED_AT'].trim()),
      updatedAt: this.normalizeDate(row['CB_UPDATED_AT'].trim())
    };

    const tweet: BookmarkedTweetImportData = {
      tweetId: row['TWEET_ID'].trim(),
      authorUsername: row['AUTHOR_USERNAME'].trim(),
      authorDisplayName: row['AUTHOR_DISPLAY_NAME']?.trim() || undefined,
      authorId: row['AUTHOR_ID']?.trim() || undefined,
      authorProfileImageUrl: row['AUTHOR_PROFILE_IMAGE_URL']?.trim() || undefined,
      content: row['CONTENT'].trim(),
      tweetDate: this.normalizeDate(row['TWEET_DATE'].trim()),
      savedAt: this.normalizeDate(row['SAVED_AT'].trim()),
      isRetweet: parseBoolean(row['IS_RETWEET']),
      isReply: parseBoolean(row['IS_REPLY']),
      replyToTweetId: row['REPLY_TO_TWEET_ID']?.trim() || undefined,
      replyToUsername: row['REPLY_TO_USERNAME']?.trim() || undefined,
      favoriteCount: parseNumber(row['FAVORITE_COUNT']),
      retweetCount: parseNumber(row['RETWEET_COUNT']),
      replyCount: parseNumber(row['REPLY_COUNT']),
      mediaUrls: decodeArrayField(row['MEDIA_URLS']),
      mediaTypes: decodeArrayField(row['MEDIA_TYPES']),
      mediaPreviewUrls: decodeArrayField(row['MEDIA_PREVIEW_URLS']),
      saveType: (row['SAVE_TYPE'].trim() as 'url' | 'blob' | 'mixed') || 'url'
    };

    return { cb, tweet };
  }

  /**
   * CBリストデータを集約
   */
  private aggregateCbData(rows: CsvRow[]): Map<string, CbImportData> {
    const cbMap = new Map<string, CbImportData>();

    for (const row of rows) {
      const cbId = row['CB_ID']?.trim();
      if (!cbId) {
        continue;
      }

      if (!cbMap.has(cbId)) {
        const { cb } = this.convertRowToImportData(row);
        cbMap.set(cbId, {
          cb,
          tweets: []
        });
      }

      const cbData = cbMap.get(cbId)!;
      const { tweet } = this.convertRowToImportData(row);
      cbData.tweets.push(tweet);
    }

    return cbMap;
  }

  /**
   * 名前と説明が一致する既存のCBを検索
   */
  private async findExistingCbByNameAndDescription(
    name: string,
    description?: string
  ): Promise<BookmarkDB | undefined> {
    const allBookmarks = await bookmarkDB.getAllBookmarks();
    
    // 説明が空の場合はundefinedとして扱う
    const normalizedDescription = description?.trim() || undefined;
    
    return allBookmarks.find(bookmark => {
      const bookmarkDescription = bookmark.description?.trim() || undefined;
      return (
        bookmark.name === name &&
        bookmarkDescription === normalizedDescription
      );
    });
  }

  /**
   * 重複しないCB名を生成
   */
  private async generateUniqueCbName(baseName: string): Promise<string> {
    const allBookmarks = await bookmarkDB.getAllBookmarks();
    const existingNames = new Set(allBookmarks.map(b => b.name));

    if (!existingNames.has(baseName)) {
      return baseName;
    }

    // パターンにマッチする名前を探す
    const pattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\((\\d+)\\)$`);
    const matchedNumbers: number[] = [];

    existingNames.forEach(name => {
      const match = name.match(pattern);
      if (match) {
        matchedNumbers.push(parseInt(match[1], 10));
      }
    });

    // 最小の利用可能な番号を見つける
    let number = 2;
    while (matchedNumbers.includes(number)) {
      number++;
    }

    return `${baseName}(${number})`;
  }

  /**
   * CSVファイルをインポート
   */
  async importFromFile(
    // eslint-disable-next-line no-undef
    file: File,
    mode: ImportMode
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      importedCbCount: 0,
      importedTweetCount: 0,
      skippedTweetCount: 0,
      errors: []
    };

    try {
      // ファイルを読み込み
      const text = await file.text();
      
      // CSVをパース
      const rows = parseCsv(text);

      if (rows.length === 0) {
        result.success = false;
        result.errors.push({
          rowNumber: 0,
          message: 'CSVファイルにデータが含まれていません'
        });
        return result;
      }

      // データを検証
      const validRows: CsvRow[] = [];
      for (let i = 0; i < rows.length; i++) {
        const validation = this.validateRow(rows[i]);
        if (validation.valid) {
          validRows.push(rows[i]);
        } else {
          result.errors.push({
            rowNumber: i + 2,
            message: validation.error || '検証エラー',
            data: rows[i]
          });
        }
      }

      if (validRows.length === 0) {
        result.success = false;
        result.errors.push({
          rowNumber: 0,
          message: '有効なデータ行がありません'
        });
        return result;
      }

      // CBデータを集約
      const cbDataMap = this.aggregateCbData(validRows);

      // 各CBをインポート
      for (const [cbId, cbData] of cbDataMap.entries()) {
        try {
          let targetCbId = cbId;

          // インポート方式に応じて処理
          // 名前と説明で既存のCBを検索
          const existingCb = await this.findExistingCbByNameAndDescription(
            cbData.cb.name,
            cbData.cb.description
          );

          if (mode === 'create') {
            // 新規作成: 既存のCBと重複しないように新しい名前を生成
            const uniqueName = await this.generateUniqueCbName(cbData.cb.name);
            const newCb = await bookmarkDB.addBookmark({
              name: uniqueName,
              description: cbData.cb.description,
              color: undefined,
              isActive: true
            });
            targetCbId = newCb.id;
            result.importedCbCount++;
          } else if (mode === 'overwrite') {
            // 上書き: 名前と説明が一致する既存のCBを更新、存在しない場合は新規作成
            if (existingCb) {
              await bookmarkDB.updateBookmark(existingCb.id, {
                name: cbData.cb.name,
                description: cbData.cb.description
              });
              // 既存のツイートを削除
              await bookmarkDB.deleteBookmarkedTweetsByBookmarkId(existingCb.id);
              targetCbId = existingCb.id;
            } else {
              const newCb = await bookmarkDB.addBookmark({
                name: cbData.cb.name,
                description: cbData.cb.description,
                color: undefined,
                isActive: true
              });
              targetCbId = newCb.id;
              result.importedCbCount++;
            }
          } else {
            // マージ: 名前と説明が一致する既存のCBにツイートを追加（重複はスキップ）
            if (existingCb) {
              targetCbId = existingCb.id;
            } else {
              const newCb = await bookmarkDB.addBookmark({
                name: cbData.cb.name,
                description: cbData.cb.description,
                color: undefined,
                isActive: true
              });
              targetCbId = newCb.id;
              result.importedCbCount++;
            }
          }

          // ツイートを追加
          const existingTweets = await bookmarkDB.getBookmarkedTweetsByBookmarkId(targetCbId);
          const existingTweetIds = new Set(existingTweets.map(t => t.tweetId));

          for (const tweet of cbData.tweets) {
            // マージモードの場合、既存のツイートはスキップ
            if (mode === 'merge' && existingTweetIds.has(tweet.tweetId)) {
              result.skippedTweetCount++;
              continue;
            }

            try {
              // CSVのsavedAtを優先して使用（インポート時に元の保存日時を保持）
              await bookmarkDB.addBookmarkedTweet(
                {
                  bookmarkId: targetCbId,
                  tweetId: tweet.tweetId,
                  authorUsername: tweet.authorUsername,
                  authorDisplayName: tweet.authorDisplayName,
                  authorId: tweet.authorId,
                  authorProfileImageUrl: tweet.authorProfileImageUrl,
                  content: tweet.content,
                  mediaUrls: tweet.mediaUrls,
                  mediaTypes: tweet.mediaTypes,
                  mediaPreviewUrls: tweet.mediaPreviewUrls,
                  tweetDate: tweet.tweetDate,
                  isRetweet: tweet.isRetweet,
                  isReply: tweet.isReply,
                  replyToTweetId: tweet.replyToTweetId,
                  replyToUsername: tweet.replyToUsername,
                  saveType: tweet.saveType,
                  favoriteCount: tweet.favoriteCount,
                  retweetCount: tweet.retweetCount,
                  replyCount: tweet.replyCount
                },
                tweet.savedAt // CSVから読み込んだsavedAtを明示的に指定
              );
              result.importedTweetCount++;
            } catch (error) {
              console.error('ツイート追加エラー:', error);
              result.skippedTweetCount++;
            }
          }
        } catch (error) {
          console.error(`CBインポートエラー (${cbId}):`, error);
          result.errors.push({
            rowNumber: 0,
            message: `CBのインポートに失敗しました: ${cbId} - ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }

      // エラーが多すぎる場合は失敗とする
      if (result.errors.length > validRows.length * 0.5) {
        result.success = false;
      }

      return result;
    } catch (error) {
      console.error('CSVインポートエラー:', error);
      result.success = false;
      result.errors.push({
        rowNumber: 0,
        message: `インポート処理中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`
      });
      return result;
    }
  }
}

// シングルトンインスタンス
export const cbCsvImportService = new CbCsvImportService();

