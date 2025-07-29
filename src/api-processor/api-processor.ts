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
  ApiCacheResult,
  CachedTweet
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
      console.log(`Comiketter: API処理開始 - ${apiType}`);

      // 操作系APIは早期リターン（重複処理を避ける）
      if (this.isOperationApi(apiType)) {
        console.log(`Comiketter: 操作系APIスキップ - ${apiType}`);
        return result;
      }

      // APIタイプに応じて処理を分岐
      switch (apiType) {
        case 'HomeTimeline':
        case 'HomeLatestTimeline':
        case 'TweetDetail':
        case 'ListLatestTweetsTimeline':
        case 'SearchTimeline':
        case 'CommunityTweetsTimeline':
        case 'CommunityTweetSearchModuleQuery':
        case 'Bookmarks':
        case 'BookmarkSearchTimeline':
        case 'UserTweets':
        case 'UserTweetsAndReplies':
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

          console.log(`Comiketter: 処理完了 - 新規: ${cacheResult.new_tweets.length}件, キャッシュ済み: ${cacheResult.cached_tweets.length}件`);
          break;

        default:
          console.log(`Comiketter: 未対応のAPIタイプ: ${apiType}`);
          break;
      }
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

      // 操作系APIは早期リターン（重複処理を避ける）
      if (this.isOperationApi(apiType)) {
        console.log(`Comiketter: 操作系APIスキップ（キャッシュ無効） - ${apiType}`);
        return result;
      }

      // APIタイプに応じて処理を分岐
      switch (apiType) {
        case 'HomeTimeline':
        case 'HomeLatestTimeline':
        case 'ListLatestTweetsTimeline':
        case 'TweetDetail':
        case 'SearchTimeline':
        case 'CommunityTweetsTimeline':
        case 'CommunityTweetSearchModuleQuery':
        case 'Bookmarks':
        case 'BookmarkSearchTimeline':
        case 'UserTweets':
        case 'UserTweetsAndReplies':
          console.log(`Comiketter: ツイート関連API処理開始 - ${apiType}`);
          // processTweetRelatedApiが期待する形式に変換
          const tweetData = { data: message.data };
          const processedTweets = this.processTweetRelatedApi(tweetData);
          console.log(`Comiketter: ツイート関連API処理完了 - 抽出数: ${processedTweets.length}`);
          result.tweets = processedTweets;
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
      // より具体的なパターンを先に判定
      if (path.includes('UserTweetsAndReplies')) return 'UserTweetsAndReplies';
      if (path.includes('UserTweets')) return 'UserTweets';
      if (path.includes('BookmarkSearchTimeline')) return 'BookmarkSearchTimeline';
      if (path.includes('Bookmarks')) return 'Bookmarks';
      if (path.includes('CommunityTweetSearchModuleQuery')) return 'CommunityTweetSearchModuleQuery';
      if (path.includes('CommunityTweetsTimeline')) return 'CommunityTweetsTimeline';
      if (path.includes('ListLatestTweetsTimeline')) return 'ListLatestTweetsTimeline';
      if (path.includes('SearchTimeline')) return 'SearchTimeline';
      if (path.includes('HomeLatestTimeline')) return 'HomeLatestTimeline';
      if (path.includes('HomeTimeline')) return 'HomeTimeline';
      if (path.includes('TweetDetail')) return 'TweetDetail';
      if (path.includes('CreateBookmarks')) return 'CreateBookmarks';
      if (path.includes('DeleteBookmark')) return 'DeleteBookmark';
      if (path.includes('FavoriteTweet')) return 'FavoriteTweet';
      if (path.includes('UnfavoriteTweet')) return 'UnfavoriteTweet';
      if (path.includes('CreateRetweet')) return 'CreateRetweet';
      if (path.includes('DeleteRetweet')) return 'DeleteRetweet';
      if (path.includes('CreateTweet')) return 'CreateTweet';
      if (path.includes('useUpsellTrackingMutation')) return 'useUpsellTrackingMutation';
    }

    if (path.includes('/favorites/create')) return 'FavoriteTweet';
    if (path.includes('/favorites/destroy')) return 'UnfavoriteTweet';
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
              // デバッグ: レスポンス構造をログ出力
        console.log('Comiketter: レスポンス構造デバッグ:', {
          hasData: !!response.data,
          dataKeys: response.data ? Object.keys(response.data) : [],
          dataDataKeys: response.data?.data ? Object.keys(response.data.data) : [],
          homeKeys: response.data?.home ? Object.keys(response.data.home) : [],
          homeTimelineKeys: response.data?.home?.home_timeline_urt ? Object.keys(response.data.home.home_timeline_urt) : [],
          threadedKeys: response.data?.threaded_conversation_with_injections_v2 ? Object.keys(response.data.threaded_conversation_with_injections_v2) : [],
          dataDataHomeKeys: response.data?.data?.home ? Object.keys(response.data.data.home) : [],
          dataDataHomeTimelineKeys: response.data?.data?.home?.home_timeline_urt ? Object.keys(response.data.data.home.home_timeline_urt) : [],
          dataDataThreadedKeys: response.data?.data?.threaded_conversation_with_injections_v2 ? Object.keys(response.data.data.threaded_conversation_with_injections_v2) : [],
          bookmarkKeys: response.data?.bookmark_timeline_v2 ? Object.keys(response.data.bookmark_timeline_v2) : [],
          dataDataBookmarkKeys: response.data?.data?.bookmark_timeline_v2 ? Object.keys(response.data.data.bookmark_timeline_v2) : [],
          listKeys: response.data?.data?.list ? Object.keys(response.data.data.list) : []
        });

      // 汎用的なinstructions探索
      let instructions = this.findInstructionsRecursively(response.data);
      
      if (instructions) {
        console.log('Comiketter: instructionsを発見しました');
      } else {
        console.log('Comiketter: instructionsが見つかりませんでした');
      }

      if (instructions) {
        const extractedTweets = this.extractTweetsFromInstructions(instructions);
        tweets.push(...extractedTweets);
      }

      // 何件のツイートが抽出されたかを表示
      console.log('Comiketter: eTFIメソッドで抽出されたツイート数:', tweets.length);

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
        'retweeted'
      ];

      // 必須キーの存在チェック
      for (const key of requiredKeys) {
        if (legacy[key] === undefined || legacy[key] === null) return false;
      }

      // possibly_sensitiveはオプションキー（存在しない場合はfalseとして扱う）
      if (legacy.possibly_sensitive === undefined || legacy.possibly_sensitive === null) {
        legacy.possibly_sensitive = false;
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
   * 汎用的なinstructions探索メソッド
   * 様々なAPIレスポンス構造からinstructionsを再帰的に探索
   * @param obj 探索対象のオブジェクト
   * @param maxDepth 最大探索深度（デフォルト: 5）
   * @returns 見つかったinstructions配列、またはnull
   */
  private findInstructionsRecursively(obj: any, maxDepth: number = 7): any[] | null {
    if (!obj || typeof obj !== 'object' || maxDepth <= 0) {
      return null;
    }

    // 直接instructionsプロパティをチェック
    if (obj.instructions && Array.isArray(obj.instructions)) {
      console.log('Comiketter: instructionsを直接発見しました');
      return obj.instructions;
    }

    // 既知のパターンを優先的にチェック
    const knownPatterns = [
      'data.home.home_timeline_urt.instructions', // HomeTimelineを検知
      'data.bookmark_timeline_v2.timeline.instructions', // Bookmarksを検知
      'data.search_by_raw_query.bookmarks_search_timeline.timeline.instructions', // BookmarkSearchTimelineを検知
      'data.list.tweets_timeline.timeline.instructions', // ListLatestTweetsTimelineを検知
      'data.threaded_conversation_with_injections_v2.instructions', // TweetDetailを検知
      'data.communityResults.result.ranked_community_timeline.timeline.instructions', // CommunityTweetsTimelineを検知
      'data.communityResults.result.community_filtered_timeline.timeline.instructions', // CommunityTweetSearchModuleQueryを検知
      'data.user.result.timeline.timeline.instructions' // UserTweetsとUserTweetsAndRepliesを検知
    ];

    for (const pattern of knownPatterns) {
      const value = this.getNestedValue(obj, pattern);
      if (value && Array.isArray(value)) {
        console.log(`Comiketter: 既知パターンでinstructionsを発見: ${pattern}`);
        return value;
      }
    }

    // 再帰的に探索
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        const result = this.findInstructionsRecursively(obj[key], maxDepth - 1);
        if (result) {
          console.log(`Comiketter: 再帰探索でinstructionsを発見: ${key}`);
          return result;
        }
      }
    }

    return null;
  }

  /**
   * ネストしたオブジェクトから指定されたパスで値を取得
   * @param obj 対象オブジェクト
   * @param path ドット区切りのパス
   * @returns 取得された値、またはundefined
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
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

  /**
   * キャッシュ統計を取得
   */
  static async getCacheStats(): Promise<{
    totalEntries: number;
    totalTweets: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    return await ApiCacheManager.getCacheStats();
  }

  /**
   * 指定されたid_strでツイートを検索
   */
  static async findTweetById(id_str: string): Promise<CachedTweet | null> {
    return await ApiCacheManager.findTweetById(id_str);
  }

  /**
   * 指定されたid_strのリストでツイートを一括検索
   */
  static async findTweetsByIds(id_strs: string[]): Promise<CachedTweet[]> {
    return await ApiCacheManager.findTweetsByIds(id_strs);
  }

  /**
   * 指定されたユーザー名でツイートを検索
   */
  static async findTweetsByUsername(username: string): Promise<CachedTweet[]> {
    return await ApiCacheManager.findTweetsByUsername(username);
  }

  /**
   * 操作系APIかどうかを判定
   */
  private isOperationApi(apiType: ApiType): boolean {
    return [
      'FavoriteTweet',
      'UnfavoriteTweet',
      'CreateRetweet',
      'DeleteRetweet',
      'CreateTweet',
      'useUpsellTrackingMutation'
    ].includes(apiType);
  }
} 