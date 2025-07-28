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
   * キャッシュを保存
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
      console.log(`Comiketter: キャッシュ保存前の総エントリ数: ${existingCache.length}`);
      
      // 同じAPIタイプとパスの既存エントリを検索
      const existingEntryIndex = existingCache.findIndex(
        entry => entry.api_type === apiType && entry.api_path === apiPath
      );
      
      console.log(`Comiketter: キャッシュ検索 - タイプ: ${apiType}, パス: ${apiPath}`);
      console.log(`Comiketter: 既存エントリインデックス: ${existingEntryIndex}`);
      
      // 既存エントリの詳細情報を表示
      if (existingEntryIndex !== -1) {
        const existingEntry = existingCache[existingEntryIndex];
        console.log(`Comiketter: 既存エントリ詳細 - タイプ: ${existingEntry.api_type}, パス: ${existingEntry.api_path}, ツイート数: ${existingEntry.tweets.length}`);
      }
      
      let filteredCache = [...existingCache];
      
      if (existingEntryIndex !== -1) {
        // 既存エントリを更新
        console.log(`Comiketter: 既存キャッシュエントリを更新 - ${apiType}: ${apiPath}`);
        filteredCache[existingEntryIndex] = cacheEntry;
      } else {
        // 新しいエントリを追加
        console.log(`Comiketter: 新しいキャッシュエントリを追加 - ${apiType}: ${apiPath}`);
        filteredCache.push(cacheEntry);
      }

      // 最大エントリ数を超えた場合、古いものから削除
      if (filteredCache.length > CACHE_CONFIG.MAX_CACHE_ENTRIES) {
        const beforeCount = filteredCache.length;
        filteredCache.sort((a, b) => b.timestamp - a.timestamp);
        filteredCache.splice(CACHE_CONFIG.MAX_CACHE_ENTRIES);
        const afterCount = filteredCache.length;
        console.log(`Comiketter: 最大エントリ数超過により削除 - ${beforeCount - afterCount}件`);
      }

      await chrome.storage.local.set({
        [CACHE_CONFIG.STORAGE_KEY]: filteredCache
      });

      console.log(`Comiketter: APIキャッシュを保存しました - ${apiType} (${uniqueTweets.length}件)`);
      console.log(`Comiketter: キャッシュ保存後の総エントリ数: ${filteredCache.length}`);
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
        console.log(`Comiketter: キャッシュ未発見 - ${apiType} (${apiPath})`);
        return [];
      }

      // 最新のキャッシュを返す
      const latestEntry = validEntries.reduce((latest, current) =>
        current.timestamp > latest.timestamp ? current : latest
      );

      console.log(`Comiketter: APIキャッシュから取得 - ${apiType} (${latestEntry.tweets.length}件)`);
      console.log(`Comiketter: キャッシュ詳細 - タイプ: ${apiType}, パス: ${apiPath}, タイムスタンプ: ${latestEntry.timestamp}`);
      return latestEntry.tweets;
    } catch (error) {
      console.error('Comiketter: APIキャッシュ取得エラー:', error);
      return [];
    }
  }

  /**
   * 新しいツイートのみを抽出（キャッシュと比較）
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
      errors: [],
    };

    try {
      // キャッシュから既存のツイートを取得
      const cachedTweets = await this.getCachedTweets(apiType, apiPath, timestamp);
      const cachedTweetIds = new Set(cachedTweets.map(tweet => tweet.id_str));
      console.log('Comiketter: cachedTweetIds length', cachedTweetIds.size); // キャッシュされているツイート数

      // デバッグ情報を追加
      console.log(`Comiketter: キャッシュ処理詳細 - ${apiType} (${apiPath})`);
      console.log(`Comiketter: 新規ツイート数: ${newTweets.length}, キャッシュ済みツイート数: ${cachedTweets.length}`);

      // 新しいツイートのみを抽出
      const newTweetsOnly = newTweets.filter(tweet => !cachedTweetIds.has(tweet.id_str));
      console.log(`Comiketter: 重複除去後の新規ツイート数: ${newTweetsOnly.length}`);

      result.cached_tweets = cachedTweets;
      result.new_tweets = newTweetsOnly;

      // キャッシュを更新（新しいツイートがある場合、または初回キャッシュの場合）
      const isFirstTimeCache = cachedTweets.length === 0;
      const shouldUpdateCache = newTweetsOnly.length > 0 || isFirstTimeCache;
      
      if (shouldUpdateCache) {
        // キャッシュ済みツイートと新しいツイートを統合して保存
        const allTweets = [...cachedTweets, ...newTweetsOnly];
        console.log(`Comiketter: キャッシュを更新 - 新規: ${newTweetsOnly.length}件, 既存: ${cachedTweets.length}件${isFirstTimeCache ? ' (初回キャッシュ)' : ''}`);
        await this.saveCache(apiType, apiPath, allTweets, timestamp);
      } else {
        console.log(`Comiketter: キャッシュ更新をスキップ - 新規ツイートなし (${apiType})`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`キャッシュ処理エラー: ${errorMessage}`);
      console.error('Comiketter: キャッシュ処理エラー:', error);
    }

    return result;
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

      console.log('Comiketter: キャッシュ統計詳細:');
      console.log(`  - 総エントリ数: ${cacheEntries.length}`);
      console.log(`  - 総ツイート数: ${totalTweets}`);
      Object.entries(apiTypeCounts).forEach(([apiType, count]) => {
        const tweetsInType = cacheEntries
          .filter(entry => entry.api_type === apiType)
          .reduce((sum, entry) => sum + entry.tweets.length, 0);
        console.log(`  - ${apiType}: ${count}エントリ (${tweetsInType}ツイート)`);
        
        // 各APIタイプの詳細パスを表示
        const entriesOfType = cacheEntries.filter(entry => entry.api_type === apiType);
        entriesOfType.forEach((entry, index) => {
          console.log(`    ${index + 1}. ${entry.api_path} (${entry.tweets.length}ツイート)`);
        });
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