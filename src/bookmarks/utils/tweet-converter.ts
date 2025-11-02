/**
 * ProcessedTweetからUI用の型に変換するユーティリティ
 */

import {
  ProcessedTweet,
  ProcessedMedia,
  ProcessedUser,
  CachedTweet
} from '../../api-processor/types';
import {
  TweetAuthor,
  TweetStats,
  TweetMediaItem
} from '../types/tweet';

/**
 * ProcessedUserをTweetAuthorに変換
 */
export function convertUserToAuthor(user: ProcessedUser): TweetAuthor {
  return {
    id: user.screen_name, // ProcessedUserにはidがないため、screen_nameを使用
    username: user.screen_name,
    displayName: user.name,
    profileImageUrl: user.avatar_url || '',
    verified: false // ProcessedUserにはverified情報がないため、デフォルトでfalse
  };
}

/**
 * ProcessedTweetをTweetStatsに変換
 */
export function convertTweetToStats(tweet: ProcessedTweet): TweetStats {
  return {
    retweetCount: tweet.retweet_count || 0,
    likeCount: tweet.favorite_count || 0,
    replyCount: tweet.reply_count || 0,
    quoteCount: tweet.quote_count || 0
  };
}

/**
 * ProcessedMediaをTweetMediaItemに変換
 */
export function convertMediaToItem(media: ProcessedMedia): TweetMediaItem {
  // media_url_httpsからpreview URLを生成
  // 通常、TwitterのメディアURLは?format=jpg&name=xxxでサイズを指定できる
  const previewUrl = media.media_url_https.replace(
    /(\?.*)?$/,
    '?format=jpg&name=small'
  );

  // typeを変換: 'photo' -> 'image', 'video' -> 'video', 'animated_gif' -> 'gif'
  let mediaType: 'image' | 'video' | 'gif' = 'image';
  if (media.type === 'video') {
    mediaType = 'video';
  } else if (media.type === 'animated_gif') {
    mediaType = 'gif';
  }

  // 動画の場合はvideo_infoからURLを取得
  let mediaUrl = media.media_url_https;
  if (mediaType === 'video' || mediaType === 'gif') {
    if (media.video_info?.variants && media.video_info.variants.length > 0) {
      // 最高ビットレートのバリアントを選択
      const bestVariant = media.video_info.variants
        .filter(v => v.bitrate)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (bestVariant) {
        mediaUrl = bestVariant.url;
      } else {
        // bitrateがない場合は最初のバリアントを使用
        mediaUrl = media.video_info.variants[0].url;
      }
    }
  }

  return {
    id: media.id_str,
    type: mediaType,
    url: mediaUrl,
    previewUrl: previewUrl,
    altText: undefined, // ProcessedMediaにはalt_text情報がない
    width: undefined,
    height: undefined
  };
}

/**
 * ProcessedTweetのcreated_at文字列をDateに変換
 */
export function parseTweetDate(createdAt: string): Date {
  // Twitter APIの日付フォーマット: "Mon Oct 23 12:34:56 +0000 2023"
  // もし既にDate形式の場合はそのまま返す
  if (createdAt instanceof Date) {
    return createdAt;
  }

  // ISO形式の場合はそのまま解析
  if (createdAt.includes('T') || createdAt.includes('Z')) {
    return new Date(createdAt);
  }

  // Twitter API形式の場合
  try {
    return new Date(createdAt);
  } catch (error) {
    console.warn('Comiketter: 日付解析エラー:', createdAt, error);
    return new Date();
  }
}

/**
 * CachedTweetをTweetAuthor、TweetStats、TweetMediaItemの配列に変換
 */
export function convertCachedTweetToUITweet(tweet: CachedTweet | ProcessedTweet): {
  author: TweetAuthor;
  stats: TweetStats;
  media: TweetMediaItem[];
  content: string;
  createdAt: Date;
} {
  // リツイートの場合はretweeted_statusを使用
  const targetTweet = 'retweeted_status' in tweet && tweet.retweeted_status
    ? tweet.retweeted_status
    : tweet;

  return {
    author: convertUserToAuthor(targetTweet.user),
    stats: convertTweetToStats(tweet),
    media: targetTweet.media
      ? targetTweet.media.map(m => convertMediaToItem(m))
      : [],
    content: targetTweet.full_text || '',
    createdAt: parseTweetDate(targetTweet.created_at)
  };
}

