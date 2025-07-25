/**
 * Twitter APIレスポンスを処理するメインクラス
 * 
 * 各種APIレスポンスを受け取り、ツイート情報を抽出して
 * 各機能で利用可能な形式に変換する
 */

import { TweetExtractor } from './tweet-extractor';
import { MediaExtractor } from './media-extractor';
import { UserExtractor } from './user-extractor';
import type { 
  ApiResponseMessage, 
  ApiProcessingResult, 
  ProcessedTweet,
  ApiType 
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
   * APIレスポンスを処理し、ツイート情報を抽出
   */
  processApiResponse(message: ApiResponseMessage): ApiProcessingResult {
    const result: ApiProcessingResult = {
      tweets: [],
      errors: []
    };

    try {
      const apiType = this.extractApiType(message.path);
      console.log(`Comiketter: API処理開始 - ${apiType} (${message.path})`);

      // APIタイプに応じて処理を分岐
      switch (apiType) {
        case 'HomeLatestTimeline':
        case 'UserTweets':
        case 'TweetDetail':
        case 'Bookmarks':
        case 'Likes':
        case 'CommunitiesExploreTimeline':
        case 'ListLatestTweetsTimeline':
          result.tweets = this.processTweetRelatedApi(message.data);
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
   * APIパスからAPIタイプを抽出
   */
  private extractApiType(path: string): ApiType {
    if (path.includes('/graphql/')) {
      if (path.includes('HomeLatestTimeline')) return 'HomeLatestTimeline';
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
   */
  private processTweetRelatedApi(data: unknown): ProcessedTweet[] {
    const tweets: ProcessedTweet[] = [];
    const response = data as any;

    try {
      // 新しいAPIレスポンス構造に対応
      if (response.data?.threaded_conversation_with_injections_v2?.instructions) {
        const extractedTweets = this.extractTweetsFromInstructions(
          response.data.threaded_conversation_with_injections_v2.instructions
        );
        tweets.push(...extractedTweets);
      }

      // 従来のツイート情報を抽出
      if (response.data?.instructions) {
        const extractedTweets = this.extractTweetsFromInstructions(response.data.instructions);
        tweets.push(...extractedTweets);
      }

      // 直接的なツイート情報
      if (response.data?.tweet) {
        const extractedTweet = this.tweetExtractor.extractFromTweet(response.data.tweet);
        if (extractedTweet) {
          tweets.push(extractedTweet);
        }
      }

      // 重複を除去（IDで判定）
      const uniqueTweets = this.removeDuplicateTweets(tweets);
      return uniqueTweets;
    } catch (error) {
      console.error('Comiketter: ツイート関連API処理エラー:', error);
      return [];
    }
  }

  /**
   * instructions配列からツイートを抽出
   */
  private extractTweetsFromInstructions(instructions: any[]): ProcessedTweet[] {
    const tweets: ProcessedTweet[] = [];

    for (const instruction of instructions) {
      if (instruction.type === 'TimelineAddEntries') {
        for (const entry of instruction.entries || []) {
          if (entry.content?.itemContent?.tweet_results?.result) {
            const extractedTweet = this.tweetExtractor.extractFromTweet(entry.content.itemContent.tweet_results.result);
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
   * 重複ツイートを除去
   */
  private removeDuplicateTweets(tweets: ProcessedTweet[]): ProcessedTweet[] {
    const seen = new Set<string>();
    return tweets.filter(tweet => {
      if (seen.has(tweet.id_str)) {
        return false;
      }
      seen.add(tweet.id_str);
      return true;
    });
  }
} 