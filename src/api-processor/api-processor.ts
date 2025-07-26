/**
 * Twitter APIレスポンスを処理するメインクラス
 * 
 * 各種APIレスポンスを受け取り、ツイート情報を抽出して
 * 各機能で利用可能な形式に変換する
 * 
 * response-processing-rule.mdに基づいてキャッシュ機能を統合
 */

import { TweetExtractor } from './tweet-extractor';
import { MediaExtractor } from './media-extractor';
import { UserExtractor } from './user-extractor';
import { ApiCacheManager } from '../utils/api-cache';
import type { 
  ApiResponseMessage, 
  ApiProcessingResult, 
  ProcessedTweet,
  ApiType,
  ApiCacheResult
} from './types';

export class ApiProcessor {
  private tweetExtractor: TweetExtractor;
  private mediaExtractor: MediaExtractor;
  private userExtractor: UserExtractor;

  constructor() {
    this.tweetExtractor = new TweetExtractor();
    this.mediaExtractor = new MediaExtractor();
    this.userExtractor = new UserExtractor();
  }

  /**
   * APIレスポンスを処理し、ツイート情報を抽出してキャッシュに保存
   */
  async processApiResponse(message: ApiResponseMessage): Promise<ApiProcessingResult> {
    const result: ApiProcessingResult = {
      tweets: [],
      errors: []
    };

    try {
      const apiType = this.extractApiType(message.path);
      console.log(`Comiketter: API処理開始 - ${apiType} (${message.path})`);

      // APIタイプに応じて処理を分岐
      switch (apiType) {
        case 'HomeTimeline':
        case 'HomeLatestTimeline':
        case 'UserTweets':
        case 'TweetDetail':
        case 'Bookmarks':
        case 'Likes':
        case 'CommunitiesExploreTimeline':
        case 'ListLatestTweetsTimeline':
          // processTweetRelatedApiが期待する形式に変換
          const tweetData = { data: message.data };
          const processedTweets = this.processTweetRelatedApi(tweetData);
          
          // キャッシュ機能を使用して処理
          const cacheResult = await ApiCacheManager.processWithCache(
            apiType,
            message.path,
            processedTweets,
            message.timestamp
          );

          // 結果を統合
          result.tweets = [...cacheResult.cached_tweets, ...cacheResult.new_tweets];
          result.errors = cacheResult.errors;

          console.log(`Comiketter: キャッシュ処理結果 - 新規: ${cacheResult.new_tweets.length}件, キャッシュ: ${cacheResult.cached_tweets.length}件`);
          break;

        case 'UserMedia':
          // 一旦処理しない（抽出不要）
          console.log('Comiketter: UserMedia APIは処理対象外です');
          break;

        case 'Favorite':
        case 'Unfavorite':
          // 一旦処理しない（抽出不要）
          console.log('Comiketter: Favorite/Unfavorite APIは処理対象外です');
          break;

        case 'CreateRetweet':
          // リツイート処理は別途実装
          console.log('Comiketter: CreateRetweet APIは別途処理が必要です');
          break;

        default:
          console.log(`Comiketter: 未対応のAPIタイプ: ${apiType}`);
          break;
      }

      console.log(`Comiketter: API処理完了 - ${apiType} (ツイート数: ${result.tweets.length})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`API処理エラー: ${errorMessage}`);
      console.error('Comiketter: API処理エラー:', error);
    }

    return result;
  }

  /**
   * キャッシュ機能を使用せずに直接処理（デバッグ用）
   */
  processApiResponseWithoutCache(message: ApiResponseMessage): ApiProcessingResult {
    const result: ApiProcessingResult = {
      tweets: [],
      errors: []
    };

    try {
      const apiType = this.extractApiType(message.path);
      console.log(`Comiketter: API処理開始（キャッシュ無効） - ${apiType} (${message.path})`);

      // APIタイプに応じて処理を分岐
      switch (apiType) {
        case 'HomeTimeline':
        case 'HomeLatestTimeline':
        case 'UserTweets':
        case 'TweetDetail':
        case 'Bookmarks':
        case 'Likes':
        case 'CommunitiesExploreTimeline':
        case 'ListLatestTweetsTimeline':
          console.log(`Comiketter: ツイート関連API処理開始 - ${apiType}`);
          // processTweetRelatedApiが期待する形式に変換
          const tweetData = { data: message.data };
          const processedTweets = this.processTweetRelatedApi(tweetData);
          console.log(`Comiketter: ツイート関連API処理完了 - 抽出数: ${processedTweets.length}`);
          result.tweets = processedTweets;
          break;

        case 'UserMedia':
          // 一旦処理しない（抽出不要）
          console.log('Comiketter: UserMedia APIは処理対象外です');
          break;

        case 'Favorite':
        case 'Unfavorite':
          // 一旦処理しない（抽出不要）
          console.log('Comiketter: Favorite/Unfavorite APIは処理対象外です');
          break;

        case 'CreateRetweet':
          // リツイート処理は別途実装
          console.log('Comiketter: CreateRetweet APIは別途処理が必要です');
          break;

        default:
          console.log(`Comiketter: 未対応のAPIタイプ: ${apiType}`);
          break;
      }

      console.log(`Comiketter: API処理完了（キャッシュ無効） - ${apiType} (ツイート数: ${result.tweets.length})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`API処理エラー: ${errorMessage}`);
      console.error('Comiketter: API処理エラー:', error);
    }

    return result;
  }

  /**
   * APIパスからAPIタイプを抽出
   */
  private extractApiType(path: string): ApiType {
    if (path.includes('/graphql/')) {
      if (path.includes('HomeLatestTimeline')) return 'HomeLatestTimeline';
      if (path.includes('HomeTimeline')) return 'HomeTimeline';
      if (path.includes('UserTweets')) return 'UserTweets';
      if (path.includes('TweetDetail')) return 'TweetDetail';
      if (path.includes('UserMedia')) return 'UserMedia';
      if (path.includes('Bookmarks')) return 'Bookmarks';
      if (path.includes('Likes')) return 'Likes';
      if (path.includes('CommunitiesExploreTimeline')) return 'CommunitiesExploreTimeline';
      if (path.includes('ListLatestTweetsTimeline')) return 'ListLatestTweetsTimeline';
    }

    if (path.includes('/favorites/create')) return 'Favorite';
    if (path.includes('/favorites/destroy')) return 'Unfavorite';
    if (path.includes('/retweet/create')) return 'CreateRetweet';

    return 'Unknown';
  }

  /**
   * ツイート関連APIのレスポンスを処理
   * response-processing-rule.md 2.3準拠
   */
  private processTweetRelatedApi(data: unknown): ProcessedTweet[] {
    const tweets: ProcessedTweet[] = [];
    const response = data as any;

    try {
      // 実際のAPIレスポンス構造に対応
      // data.home.home_timeline_urt.instructions または data.instructions
      let instructions = null;
      
      if (response.data?.home?.home_timeline_urt?.instructions) {
        instructions = response.data.home.home_timeline_urt.instructions;
      } else if (response.data?.instructions) {
        instructions = response.data.instructions;
      }

      if (instructions) {
        const extractedTweets = this.extractTweetsFromInstructions(instructions);
        tweets.push(...extractedTweets);
      }

      return tweets;
    } catch (error) {
      console.error('Comiketter: ツイート関連API処理エラー:', error);
      return [];
    }
  }

  /**
   * instructions配列からツイートを抽出（.md 2.3準拠）
   * entries[].content.itemContent.tweet_results.result から tweet を取り出す
   */
  private extractTweetsFromInstructions(instructions: any[]): ProcessedTweet[] {
    const tweets: ProcessedTweet[] = [];

    for (const instruction of instructions) {
      if (instruction.type === 'TimelineAddEntries') {
        for (const entry of instruction.entries || []) {
          const result = entry.content?.itemContent?.tweet_results?.result;
          if (result && this.hasRequiredTweetKeys(result)) {
            const extractedTweet = this.extractTweetWithRetweet(result);
            if (extractedTweet) {
              tweets.push(extractedTweet);
            }
          }
        }
      }
    }

    return tweets;
  }

  /**
   * ツイートを抽出（リツイート元も含む）
   */
  private extractTweetWithRetweet(tweet: any): ProcessedTweet | null {
    try {
      // リツイート元がある場合は再帰的に抽出
      if (tweet.retweeted_status_result?.result && this.hasRequiredTweetKeys(tweet.retweeted_status_result.result)) {
        const retweet = this.extractTweetWithRetweet(tweet.retweeted_status_result.result);
        if (retweet) {
          const mainTweet = this.tweetExtractor.extractFromTweet(tweet);
          if (mainTweet) {
            mainTweet.retweeted_status = retweet;
            return mainTweet;
          }
        }
      }

      // 通常ツイート
      return this.tweetExtractor.extractFromTweet(tweet);
    } catch (error) {
      console.error('Comiketter: ツイート抽出エラー:', error);
      return null;
    }
  }

  /**
   * 必須キーがすべて存在するかチェック（.md準拠）
   */
  private hasRequiredTweetKeys(tweet: any): boolean {
    try {
      // legacy必須
      if (!tweet.legacy) return false;
      const legacy = tweet.legacy;

      // 必須キー一覧（.md準拠）
      const requiredKeys = [
        'id_str',
        'full_text', 
        'created_at',
        'favorite_count',
        'retweet_count',
        'reply_count',
        'quote_count',
        'bookmarked',
        'favorited',
        'retweeted',
        'possibly_sensitive'
      ];

      // 必須キーの存在チェック
      for (const key of requiredKeys) {
        if (legacy[key] === undefined || legacy[key] === null) return false;
      }

      // ユーザー情報必須（実際のAPIレスポンス構造に合わせて修正）
      const user = tweet.core?.user_results?.result?.core;
      if (!user?.name || !user?.screen_name) return false;
      
      const avatar = tweet.core?.user_results?.result?.avatar?.image_url;
      if (!avatar) return false;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * キャッシュ管理メソッド（外部から呼び出し可能）
   */
  static async cleanupExpiredCache(): Promise<void> {
    await ApiCacheManager.cleanupExpiredCache();
  }

  static async clearAllCache(): Promise<void> {
    await ApiCacheManager.clearAllCache();
  }

  static async getCacheStats(): Promise<{
    totalEntries: number;
    totalTweets: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    return await ApiCacheManager.getCacheStats();
  }
} 