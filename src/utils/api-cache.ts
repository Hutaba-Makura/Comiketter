/**
 * APIキャッシュ管理ユーティリティ
 * 
 * Twitter APIレスポンスから抽出したツイート情報をキャッシュとして保存し、
 * 重複処理を避けてパフォーマンスを向上させる
 */

import type { 
  CachedTweet, 
  ApiCacheEntry, 
  ApiCacheResult, 
  ProcessedTweet, 
  ProcessedUser,
  ProcessedMedia,
  ApiType 
} from '../api-processor/types';

// キャッシュ設定
const CACHE_CONFIG = {
  // キャッシュの有効期限（24時間）
  EXPIRES_IN_HOURS: 24,
  // 最大キャッシュエントリ数
  MAX_CACHE_ENTRIES: 1000,
  // ストレージキー
  STORAGE_KEY: 'comiketter_api_cache',
} as const;

/**
 * APIキャッシュ管理クラス
 */
export class ApiCacheManager {
  /**
   * キャッシュにツイートを保存
   */
  static async saveCache(
    apiType: ApiType,
    apiPath: string,
    tweets: ProcessedTweet[],
    timestamp: number
  ): Promise<void> {
    try {
      // 重複ツイートを除去（id_strで判定）
      const uniqueTweets = this.removeDuplicateTweets(tweets);
      
      const cacheEntry: ApiCacheEntry = {
        id: this.generateCacheId(apiType, apiPath, timestamp),
        tweets: uniqueTweets.map(tweet => ({
          ...tweet,
          cached_at: timestamp,
          api_source: apiPath,
        })),
        api_type: apiType,
        api_path: apiPath,
        timestamp,
        expires_at: timestamp + (CACHE_CONFIG.EXPIRES_IN_HOURS * 60 * 60 * 1000),
      };

      const existingCache = await this.getCacheEntries();
      
      // 同じAPIタイプとパスの既存エントリを検索
      const existingEntryIndex = existingCache.findIndex(
        entry => entry.api_type === apiType && entry.api_path === apiPath
      );
      
      let filteredCache = [...existingCache];
      
      if (existingEntryIndex !== -1) {
        // 既存エントリを更新
        console.log(`Comiketter: キャッシュ更新 - ${apiType} (${uniqueTweets.length}件)`);
        filteredCache[existingEntryIndex] = cacheEntry;
      } else {
        // 新しいエントリを追加
        console.log(`Comiketter: キャッシュ新規作成 - ${apiType} (${uniqueTweets.length}件)`);
        filteredCache.push(cacheEntry);
      }

      // 期限切れキャッシュを削除
      const currentTimestamp = Date.now();
      const validCache = filteredCache.filter(
        entry => entry.expires_at > currentTimestamp
      );

      // 最大エントリ数を超えた場合、古いものから削除
      if (validCache.length > CACHE_CONFIG.MAX_CACHE_ENTRIES) {
        const beforeCount = validCache.length;
        validCache.sort((a, b) => b.timestamp - a.timestamp);
        validCache.splice(CACHE_CONFIG.MAX_CACHE_ENTRIES);
        const afterCount = validCache.length;
        console.log(`Comiketter: 最大エントリ数超過により削除 - ${beforeCount - afterCount}件`);
      }

      // 期限切れデータが削除された場合、ログ出力
      if (validCache.length < filteredCache.length) {
        const removedCount = filteredCache.length - validCache.length;
        console.log(`Comiketter: 期限切れキャッシュを自動削除 - ${removedCount}件`);
      }

      await chrome.storage.local.set({
        [CACHE_CONFIG.STORAGE_KEY]: validCache
      });
    } catch (error) {
      console.error('Comiketter: APIキャッシュ保存エラー:', error);
    }
  }

  /**
   * キャッシュからツイートを取得
   */
  static async getCachedTweets(
    apiType: ApiType,
    apiPath: string,
    currentTimestamp: number
  ): Promise<CachedTweet[]> {
    try {
      const cacheEntries = await this.getCacheEntries();
      
      // 有効期限が切れていないキャッシュを取得
      const validEntries = cacheEntries.filter(
        entry => 
          entry.api_type === apiType &&
          entry.api_path === apiPath &&
          entry.expires_at > currentTimestamp
      );

      if (validEntries.length === 0) {
        return [];
      }

      // 最新のキャッシュを返す
      const latestEntry = validEntries.reduce((latest, current) =>
        current.timestamp > latest.timestamp ? current : latest
      );

      console.log(`Comiketter: キャッシュ取得 - ${apiType} (${latestEntry.tweets.length}件)`);
      return latestEntry.tweets;
    } catch (error) {
      console.error('Comiketter: APIキャッシュ取得エラー:', error);
      return [];
    }
  }

  /**
   * キャッシュ機能を使用してAPIレスポンスを処理
   * 同じツイートが読み込まれたら最新情報で上書きする
   * ただし、0やundefinedの値は既存の正常な値で補完する
   */
  static async processWithCache(
    apiType: ApiType,
    apiPath: string,
    newTweets: ProcessedTweet[],
    timestamp: number
  ): Promise<ApiCacheResult> {
    const result: ApiCacheResult = {
      cached_tweets: [],
      new_tweets: [],
      errors: []
    };

    try {
      // 既存のキャッシュからツイートを取得
      const cachedTweets = await this.getCachedTweets(apiType, apiPath, timestamp);
      const cachedTweetMap = new Map(cachedTweets.map(tweet => [tweet.id_str, tweet]));

      // 新規ツイートと既存ツイートを分離
      const newTweetsOnly: ProcessedTweet[] = [];
      const updatedTweets: ProcessedTweet[] = [];

      for (const tweet of newTweets) {
        const cachedTweet = cachedTweetMap.get(tweet.id_str);
        if (cachedTweet) {
          // 既存のツイートはマージ処理で更新
          const mergedTweet = this.mergeTweets(cachedTweet, tweet);
          updatedTweets.push(mergedTweet);
          console.log(`Comiketter: キャッシュ内のツイートを更新: ${tweet.id_str}`);
        } else {
          // 新規ツイート
          newTweetsOnly.push(tweet);
        }
      }

      // 初回キャッシュの場合は、新規ツイートが0件でも保存
      const isFirstTimeCache = cachedTweets.length === 0;
      
      if (newTweetsOnly.length > 0 || updatedTweets.length > 0 || isFirstTimeCache) {
        // 既存のキャッシュから更新対象のツイートを削除
        const updatedTweetIds = new Set(updatedTweets.map(t => t.id_str));
        const cachedTweetsWithoutUpdated = cachedTweets.filter(
          tweet => !updatedTweetIds.has(tweet.id_str)
        );

        // 更新されたツイートと新しいツイートを統合して保存
        const allTweets = [...cachedTweetsWithoutUpdated, ...updatedTweets, ...newTweetsOnly];
        await this.saveCache(apiType, apiPath, allTweets, timestamp);

        if (updatedTweets.length > 0) {
          console.log(`Comiketter: キャッシュ更新 - ${apiType} (更新: ${updatedTweets.length}件, 新規: ${newTweetsOnly.length}件)`);
        }
      }

      result.cached_tweets = cachedTweets;
      result.new_tweets = newTweetsOnly;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`キャッシュ処理エラー: ${errorMessage}`);
      console.error('Comiketter: キャッシュ処理エラー:', error);
    }

    return result;
  }

  /**
   * 2つのツイートをマージする
   * 後から来た方の数値に更新し、0やundefinedの値は既存の正常な値で補完する
   * @param existing 既存のツイート（キャッシュ）
   * @param incoming 新しく来たツイート
   * @returns マージされたツイート
   */
  private static mergeTweets(
    existing: CachedTweet | ProcessedTweet,
    incoming: ProcessedTweet
  ): ProcessedTweet {
    // 基本的には新しいツイートで上書き
    const merged: ProcessedTweet = {
      ...incoming,
      // 数値フィールドのマージ処理
      favorite_count: this.mergeNumberValue(
        incoming.favorite_count,
        existing.favorite_count
      ),
      retweet_count: this.mergeNumberValue(
        incoming.retweet_count,
        existing.retweet_count
      ),
      reply_count: this.mergeNumberValue(
        incoming.reply_count,
        existing.reply_count
      ),
      quote_count: this.mergeNumberValue(
        incoming.quote_count,
        existing.quote_count
      ),
      // 文字列フィールドのマージ処理（空文字列やundefinedの場合は既存の値を使用）
      full_text: incoming.full_text || existing.full_text || '',
      created_at: incoming.created_at || existing.created_at || '',
      // ユーザー情報のマージ処理
      user: this.mergeUser(existing.user, incoming.user),
      // メディア情報のマージ処理（新しい方が空の場合は既存の値を使用）
      media: this.mergeMedia(existing.media, incoming.media),
      // その他のオプショナルフィールド
      in_reply_to_screen_name: incoming.in_reply_to_screen_name || existing.in_reply_to_screen_name,
      in_reply_to_status_id_str: incoming.in_reply_to_status_id_str || existing.in_reply_to_status_id_str,
      in_reply_to_user_id_str: incoming.in_reply_to_user_id_str || existing.in_reply_to_user_id_str,
      conversation_id_str: incoming.conversation_id_str || existing.conversation_id_str,
      // リツイート元の情報（新しい方が存在する場合はそれを使用、なければ既存の値）
      retweeted_status: incoming.retweeted_status || existing.retweeted_status,
    };

    return merged;
  }

  /**
   * 数値をマージする
   * 新しい値がundefinedやnullの場合は、既存の正常な値を使用する
   * 新しい値が0の場合は、既存の値が0より大きければ既存の値を使用（0は有効な値だが、既存の値の方が信頼できる場合）
   * @param newValue 新しい値
   * @param existingValue 既存の値
   * @returns マージされた値
   */
  private static mergeNumberValue(
    newValue: number | undefined,
    existingValue: number | undefined
  ): number {
    // 新しい値がundefinedやnullの場合は、既存の値を使用（既存の値もundefinedやnullの場合は0）
    if (newValue === undefined || newValue === null) {
      return existingValue ?? 0;
    }
    // 新しい値が0の場合、既存の値が0より大きければ既存の値を使用（0は有効な値だが、既存の値の方が信頼できる）
    if (newValue === 0 && existingValue !== undefined && existingValue !== null && existingValue > 0) {
      return existingValue;
    }
    // 新しい値が0より大きい場合は、それを使用
    if (newValue > 0) {
      return newValue;
    }
    // その他の場合は新しい値を使用
    return newValue;
  }

  /**
   * ユーザー情報をマージする
   * @param existing 既存のユーザー情報
   * @param incoming 新しいユーザー情報
   * @returns マージされたユーザー情報
   */
  private static mergeUser(
    existing: ProcessedUser,
    incoming: ProcessedUser
  ): ProcessedUser {
    return {
      name: incoming.name || existing.name || '',
      screen_name: incoming.screen_name || existing.screen_name || '',
      avatar_url: incoming.avatar_url || existing.avatar_url || '',
    };
  }

  /**
   * メディア情報をマージする
   * 新しい方が空の場合は既存の値を使用
   * @param existing 既存のメディア情報
   * @param incoming 新しいメディア情報
   * @returns マージされたメディア情報
   */
  private static mergeMedia(
    existing: ProcessedMedia[] | undefined,
    incoming: ProcessedMedia[] | undefined
  ): ProcessedMedia[] | undefined {
    // 新しい方が存在し、空でない場合はそれを使用
    if (incoming && incoming.length > 0) {
      return incoming;
    }
    // 新しい方が空やundefinedの場合は、既存の値を使用
    if (existing && existing.length > 0) {
      return existing;
    }
    // どちらも存在しない場合はundefined
    return undefined;
  }

  /**
   * 期限切れのキャッシュを削除
   */
  static async cleanupExpiredCache(): Promise<void> {
    try {
      const cacheEntries = await this.getCacheEntries();
      const currentTimestamp = Date.now();
      
      const validEntries = cacheEntries.filter(
        entry => entry.expires_at > currentTimestamp
      );

      if (validEntries.length < cacheEntries.length) {
        await chrome.storage.local.set({
          [CACHE_CONFIG.STORAGE_KEY]: validEntries
        });
        
        const removedCount = cacheEntries.length - validEntries.length;
        console.log(`Comiketter: 期限切れキャッシュを削除しました - ${removedCount}件`);
      }
    } catch (error) {
      console.error('Comiketter: キャッシュクリーンアップエラー:', error);
    }
  }

  /**
   * 全キャッシュを削除
   */
  static async clearAllCache(): Promise<void> {
    try {
      await chrome.storage.local.remove(CACHE_CONFIG.STORAGE_KEY);
      console.log('Comiketter: 全APIキャッシュを削除しました');
    } catch (error) {
      console.error('Comiketter: キャッシュ削除エラー:', error);
    }
  }

  /**
   * キャッシュ統計を取得
   */
  static async getCacheStats(): Promise<{
    totalEntries: number;
    totalTweets: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    try {
      const cacheEntries = await this.getCacheEntries();
      
      if (cacheEntries.length === 0) {
        return {
          totalEntries: 0,
          totalTweets: 0,
          oldestEntry: null,
          newestEntry: null,
        };
      }

      const totalTweets = cacheEntries.reduce((sum, entry) => sum + entry.tweets.length, 0);
      const timestamps = cacheEntries.map(entry => entry.timestamp);

      // 各APIタイプのエントリ数を集計
      const apiTypeCounts = cacheEntries.reduce((counts, entry) => {
        counts[entry.api_type] = (counts[entry.api_type] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      console.log('Comiketter: キャッシュ統計:');
      console.log(`  - 総エントリ数: ${cacheEntries.length}`);
      console.log(`  - 総ツイート数: ${totalTweets}`);
      Object.entries(apiTypeCounts).forEach(([apiType, count]) => {
        const tweetsInType = cacheEntries
          .filter(entry => entry.api_type === apiType)
          .reduce((sum, entry) => sum + entry.tweets.length, 0);
        console.log(`  - ${apiType}: ${count}エントリ (${tweetsInType}ツイート)`);
      });

      return {
        totalEntries: cacheEntries.length,
        totalTweets,
        oldestEntry: Math.min(...timestamps),
        newestEntry: Math.max(...timestamps),
      };
    } catch (error) {
      console.error('Comiketter: キャッシュ統計取得エラー:', error);
      return {
        totalEntries: 0,
        totalTweets: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * 指定されたid_strでツイートを検索
   * @param id_str ツイートID
   * @param includeExpired 期限切れのキャッシュも検索するか（デフォルト: true）
   */
  static async findTweetById(id_str: string, includeExpired: boolean = true): Promise<CachedTweet | null> {
    try {
      const cacheEntries = await this.getCacheEntries();
      const currentTimestamp = Date.now();
      
      // 有効期限が切れていないキャッシュエントリから検索
      let searchEntries = cacheEntries;
      if (!includeExpired) {
        searchEntries = cacheEntries.filter(
          entry => entry.expires_at > currentTimestamp
        );
      } else {
        // 有効期限内のエントリを優先
        const validEntries = cacheEntries.filter(
          entry => entry.expires_at > currentTimestamp
        );
        const expiredEntries = cacheEntries.filter(
          entry => entry.expires_at <= currentTimestamp
        );
        // 有効期限内のエントリを先に検索
        searchEntries = [...validEntries, ...expiredEntries];
      }

      // 全ツイートをフラット化して検索
      for (const entry of searchEntries) {
        const foundTweet = entry.tweets.find(tweet => tweet.id_str === id_str);
        if (foundTweet) {
          const isExpired = entry.expires_at <= currentTimestamp;
          if (isExpired) {
            console.warn(`Comiketter: 期限切れキャッシュからツイートを発見 - ${id_str} (API: ${entry.api_type}, 期限切れ: ${Math.floor((currentTimestamp - entry.expires_at) / 1000 / 60 / 60)}時間前)`);
          } else {
            console.log(`Comiketter: キャッシュからツイートを発見 - ${id_str} (API: ${entry.api_type})`);
          }
          return foundTweet;
        }
      }

      console.log(`Comiketter: キャッシュにツイートが見つかりませんでした - ${id_str} (検索エントリ数: ${searchEntries.length}, 総エントリ数: ${cacheEntries.length})`);
      return null;
    } catch (error) {
      console.error('Comiketter: ツイート検索エラー:', error);
      return null;
    }
  }

  /**
   * 指定されたid_strのリストでツイートを一括検索
   */
  static async findTweetsByIds(id_strs: string[]): Promise<CachedTweet[]> {
    try {
      const cacheEntries = await this.getCacheEntries();
      const currentTimestamp = Date.now();
      
      // 有効期限が切れていないキャッシュエントリから検索
      const validEntries = cacheEntries.filter(
        entry => entry.expires_at > currentTimestamp
      );

      const foundTweets: CachedTweet[] = [];
      const foundIds = new Set<string>();

      // 全ツイートをフラット化して検索
      for (const entry of validEntries) {
        for (const tweet of entry.tweets) {
          if (id_strs.includes(tweet.id_str) && !foundIds.has(tweet.id_str)) {
            foundTweets.push(tweet);
            foundIds.add(tweet.id_str);
          }
        }
      }

      console.log(`Comiketter: キャッシュからツイートを一括検索 - 検索対象: ${id_strs.length}件, 発見: ${foundTweets.length}件`);
      return foundTweets;
    } catch (error) {
      console.error('Comiketter: ツイート一括検索エラー:', error);
      return [];
    }
  }

  /**
   * 指定されたユーザー名でツイートを検索
   */
  static async findTweetsByUsername(username: string): Promise<CachedTweet[]> {
    try {
      const cacheEntries = await this.getCacheEntries();
      const currentTimestamp = Date.now();
      
      // 有効期限が切れていないキャッシュエントリから検索
      const validEntries = cacheEntries.filter(
        entry => entry.expires_at > currentTimestamp
      );

      const foundTweets: CachedTweet[] = [];

      // 全ツイートをフラット化して検索
      for (const entry of validEntries) {
        for (const tweet of entry.tweets) {
          if (tweet.user?.screen_name === username || tweet.user?.name === username) {
            foundTweets.push(tweet);
          }
        }
      }

      console.log(`Comiketter: キャッシュからユーザーのツイートを検索 - ${username} (${foundTweets.length}件)`);
      return foundTweets;
    } catch (error) {
      console.error('Comiketter: ユーザーツイート検索エラー:', error);
      return [];
    }
  }

  /**
   * キャッシュエントリを取得
   */
  private static async getCacheEntries(): Promise<ApiCacheEntry[]> {
    try {
      const result = await chrome.storage.local.get(CACHE_CONFIG.STORAGE_KEY);
      return result[CACHE_CONFIG.STORAGE_KEY] || [];
    } catch (error) {
      console.error('Comiketter: キャッシュエントリ取得エラー:', error);
      return [];
    }
  }

  /**
   * キャッシュIDを生成
   */
  private static generateCacheId(apiType: ApiType, apiPath: string, timestamp: number): string {
    return `${apiType}_${this.hashString(apiPath)}_${timestamp}`;
  }

  /**
   * 文字列のハッシュ値を生成
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32ビット整数に変換
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 重複ツイートを除去
   */
  private static removeDuplicateTweets(tweets: ProcessedTweet[]): ProcessedTweet[] {
    const seenIds = new Set<string>();
    return tweets.filter(tweet => {
      if (seenIds.has(tweet.id_str)) {
        return false;
      }
      seenIds.add(tweet.id_str);
      return true;
    });
  }
} 