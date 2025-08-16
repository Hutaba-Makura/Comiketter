/**
 * ツイート情報を抽出するクラス
 * 
 * Twitter APIレスポンスからツイートの基本情報を抽出し、
 * 統一された形式に変換する
 */

import { UserExtractor } from './user-extractor';
import { MediaExtractor } from './media-extractor';
import type { ProcessedTweet } from './types';

export class TweetExtractor {
  private userExtractor: UserExtractor;
  private mediaExtractor: MediaExtractor;

  constructor() {
    this.userExtractor = new UserExtractor();
    this.mediaExtractor = new MediaExtractor();
  }

  /**
   * ツイートオブジェクトからProcessedTweetを抽出
   */
  extractFromTweet(tweetData: any): ProcessedTweet | null {
    try {
      if (!tweetData?.legacy?.id_str) {
        return null;
      }

      const legacy = tweetData.legacy;
      const user = this.userExtractor.extractFromTweet(tweetData);
      
      if (!user) {
        console.warn('Comiketter: ユーザー情報の抽出に失敗しました');
        return null;
      }

      const tweet: ProcessedTweet = {
        id_str: legacy.id_str,
        full_text: legacy.full_text || '',
        created_at: legacy.created_at || '',
        favorite_count: legacy.favorite_count || 0,
        retweet_count: legacy.retweet_count || 0,
        reply_count: legacy.reply_count || 0,
        quote_count: legacy.quote_count || 0,
        bookmarked: legacy.bookmarked || false,
        favorited: legacy.favorited || false,
        retweeted: legacy.retweeted || false,
        possibly_sensitive: legacy.possibly_sensitive || false,
        user: user,
        in_reply_to_screen_name: legacy.in_reply_to_screen_name,
        in_reply_to_status_id_str: legacy.in_reply_to_status_id_str,
        in_reply_to_user_id_str: legacy.in_reply_to_user_id_str,
        conversation_id_str: legacy.conversation_id_str
      };

      // メディア情報を抽出
      if (legacy.extended_entities?.media) {
        tweet.media = this.mediaExtractor.extractFromTweet(tweetData);
      }

      // リツイート元の情報を抽出
      if (tweetData.retweeted_status_result?.result) {
        const retweetedTweet = this.extractFromTweet(tweetData.retweeted_status_result.result);
        if (retweetedTweet) {
          tweet.retweeted_status = retweetedTweet;
        }
      }

      return tweet;
    } catch (error) {
      console.error('Comiketter: ツイート抽出エラー:', error);
      return null;
    }
  }

  /**
   * 複数のツイートを一括抽出
   */
  extractMultipleFromTweets(tweetsData: any[]): ProcessedTweet[] {
    const tweets: ProcessedTweet[] = [];

    for (const tweetData of tweetsData) {
      const tweet = this.extractFromTweet(tweetData);
      if (tweet) {
        tweets.push(tweet);
      }
    }

    return tweets;
  }
} 