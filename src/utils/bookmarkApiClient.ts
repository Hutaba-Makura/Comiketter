/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ブックマークAPIクライアント（コンテンツスクリプト用）
 */

import type { CustomBookmark, BookmarkedTweet, BookmarkStats } from '../types';
import { MediaExtractor } from '../api-processor/media-extractor';

/**
 * コンテンツスクリプトからbackground scriptを経由してブックマーク機能にアクセスするクライアント
 */
export class BookmarkApiClient {
  private static instance: BookmarkApiClient;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): BookmarkApiClient {
    if (!BookmarkApiClient.instance) {
      BookmarkApiClient.instance = new BookmarkApiClient();
    }
    return BookmarkApiClient.instance;
  }

  /**
   * background scriptにメッセージを送信
   */
  private async sendMessage(action: string, data?: any): Promise<any> {
    try {
      // 拡張機能コンテキストが有効かチェック
      if (!chrome?.runtime?.id) {
        throw new Error('Extension context invalidated');
      }

      const response = await chrome.runtime.sendMessage({
        type: 'BOOKMARK_ACTION',
        payload: { action, data }
      });
      
      if (response && response.success === false) {
        throw new Error(response.error || 'Unknown error');
      }
      
      return response.data || response;
    } catch (error) {
      // Extension context invalidatedエラーの場合は、エラーログを抑制
      if (error instanceof Error && error.message === 'Extension context invalidated') {
        // 開発者向けのログのみ出力（ユーザーには表示しない）
        console.debug('BookmarkApiClient: Extension context invalidated, message ignored');
        // デフォルト値を返す（呼び出し側で適切に処理される）
        return null;
      }
      console.error('BookmarkApiClient: Failed to send message:', error);
      throw error;
    }
  }

  /**
   * background scriptにキャッシュアクションのメッセージを送信
   */
  private async sendCacheMessage(action: string, data?: any): Promise<any> {
    try {
      // 拡張機能コンテキストが有効かチェック
      if (!chrome?.runtime?.id) {
        throw new Error('Extension context invalidated');
      }

      const response = await chrome.runtime.sendMessage({
        type: 'CACHE_ACTION',
        payload: { action, data }
      });
      
      if (response && response.success === false) {
        throw new Error(response.error || 'Unknown error');
      }
      
      return response.data || response;
    } catch (error) {
      // Extension context invalidatedエラーの場合は、エラーログを抑制
      if (error instanceof Error && error.message === 'Extension context invalidated') {
        // 開発者向けのログのみ出力（ユーザーには表示しない）
        console.debug('BookmarkApiClient: Extension context invalidated, cache message ignored');
        // デフォルト値を返す（呼び出し側で適切に処理される）
        return null;
      }
      console.error('BookmarkApiClient: Failed to send cache message:', error);
      throw error;
    }
  }

  /**
   * 全ブックマークを取得
   */
  async getBookmarks(): Promise<CustomBookmark[]> {
    return await this.sendMessage('getBookmarks');
  }

  /**
   * カスタムブックマークを追加（非推奨: createCbを使用してください）
   */
  async addBookmark(name: string, description?: string, color?: string): Promise<CustomBookmark> {
    return await this.sendMessage('addBookmark', {
      name,
      description,
      color,
      isActive: true,
    });
  }

  /**
   * CBを作成（推奨）
   */
  async createCb(name: string, description?: string): Promise<CustomBookmark> {
    const cb = await this.sendMessage('createCb', {
      name,
      description,
    });
    
    // Cb型をCustomBookmark型に変換
    // Chrome Extensionのメッセージパッシングでは、Dateオブジェクトが文字列に変換されるため
    // createdAtとupdatedAtが既に文字列の場合はそのまま使用し、
    // Dateオブジェクトの場合のみtoISOString()を呼び出す
    const createdAt = typeof cb.createdAt === 'string' 
      ? cb.createdAt 
      : cb.createdAt instanceof Date 
        ? cb.createdAt.toISOString()
        : new Date(cb.createdAt).toISOString();
    
    const updatedAt = typeof cb.updatedAt === 'string'
      ? cb.updatedAt
      : cb.updatedAt instanceof Date
        ? cb.updatedAt.toISOString()
        : new Date(cb.updatedAt).toISOString();
    
    return {
      id: cb.id,
      name: cb.name,
      description: cb.description,
      createdAt,
      updatedAt,
      isActive: true,
      tweetCount: cb.tweetCount,
    };
  }

  /**
   * カスタムブックマークを更新
   */
  async updateBookmark(id: string, updates: Partial<CustomBookmark>): Promise<void> {
    return await this.sendMessage('updateBookmark', { id, updates });
  }

  /**
   * カスタムブックマークを削除
   */
  async deleteBookmark(id: string): Promise<void> {
    return await this.sendMessage('deleteBookmark', { id });
  }

  /**
   * ブックマーク統計を取得
   */
  async getBookmarkStats(): Promise<BookmarkStats> {
    return await this.sendMessage('getBookmarkStats');
  }

  /**
   * ブックマーク済みツイートを追加
   */
  async addBookmarkedTweet(
    bookmarkId: string,
    tweetId: string,
    authorUsername: string,
    authorDisplayName: string,
    authorId: string,
    content: string,
    tweetDate: string,
    isRetweet: boolean = false,
    isReply: boolean = false,
    mediaUrls?: string[],
    mediaTypes?: string[],
    replyToTweetId?: string,
    replyToUsername?: string,
    saveType: 'url' | 'blob' | 'mixed' = 'url',
    authorProfileImageUrl?: string,
    favoriteCount?: number,
    retweetCount?: number,
    replyCount?: number,
    mediaPreviewUrls?: string[]
  ): Promise<BookmarkedTweet> {
    // 送信する情報をログに出力して確認
    console.log('Comiketter: [Bookmark] addBookmarkedTweet called with:', {
      bookmarkId,
      tweetId,
      authorUsername,
      authorDisplayName,
      authorId,
      authorProfileImageUrl,
      favoriteCount,
      retweetCount,
      replyCount,
      hasContent: !!content,
      hasMediaUrls: !!mediaUrls && mediaUrls.length > 0,
      mediaUrlsCount: mediaUrls?.length || 0
    });
    
    return await this.sendMessage('addBookmarkedTweet', {
      bookmarkId,
      tweetId,
      authorUsername,
      authorDisplayName,
      authorId,
      authorProfileImageUrl,
      content,
      mediaUrls,
      mediaTypes,
      mediaPreviewUrls,
      tweetDate,
      isRetweet,
      isReply,
      replyToTweetId,
      replyToUsername,
      saveType,
      favoriteCount,
      retweetCount,
      replyCount,
    });
  }

  /**
   * ブックマークIDでツイートを取得
   */
  async getBookmarkedTweetsByBookmarkId(bookmarkId: string): Promise<BookmarkedTweet[]> {
    return await this.sendMessage('getBookmarkedTweetsByBookmarkId', { bookmarkId });
  }

  /**
   * ツイートIDでブックマーク済みツイートを取得
   */
  async getBookmarkedTweetByTweetId(tweetId: string): Promise<BookmarkedTweet[]> {
    return await this.sendMessage('getBookmarkedTweetByTweetId', { tweetId });
  }

  /**
   * ユーザー名でブックマーク済みツイートを検索
   */
  async getBookmarkedTweetsByUsername(username: string): Promise<BookmarkedTweet[]> {
    return await this.sendMessage('getBookmarkedTweetsByUsername', { username });
  }

  /**
   * ブックマーク済みツイートを更新
   */
  async updateBookmarkedTweet(id: string, updates: Partial<BookmarkedTweet>): Promise<void> {
    return await this.sendMessage('updateBookmarkedTweet', { id, updates });
  }

  /**
   * ブックマーク済みツイートを削除
   */
  async deleteBookmarkedTweet(id: string): Promise<void> {
    return await this.sendMessage('deleteBookmarkedTweet', { id });
  }

  /**
   * ツイートが既にブックマークされているかチェック
   */
  async isTweetBookmarked(tweetId: string, bookmarkId?: string): Promise<boolean> {
    const bookmarkedTweets = await this.getBookmarkedTweetByTweetId(tweetId);
    
    if (bookmarkId) {
      return bookmarkedTweets.some(tweet => tweet.bookmarkId === bookmarkId);
    }
    
    return bookmarkedTweets.length > 0;
  }

  /**
   * ツイートをブックマークに追加（簡易版）
   * 既に同じリストに同じツイートが存在する場合は、最新情報で上書きする
   */
  async addTweetToBookmark(bookmarkId: string, tweetId: string, tweetInfo?: any): Promise<void> {
    console.log('Comiketter: [Bookmark] addTweetToBookmark called', {
      bookmarkId,
      tweetId,
      hasTweetInfo: !!tweetInfo,
      tweetInfoMedia: tweetInfo?.media
    });
    
    // 既に同じリストにブックマークされているかチェック（ログ出力用）
    const isAlreadyBookmarked = await this.isTweetBookmarked(tweetId, bookmarkId);
    if (isAlreadyBookmarked) {
      console.log('Comiketter: [Bookmark] Tweet is already bookmarked in this list. Will overwrite with latest information.');
    }
    
    // 既存のツイート情報を取得
    const existingTweets = await this.getBookmarkedTweetByTweetId(tweetId);
    
    if (existingTweets.length > 0) {
      // 既存のツイート情報がある場合は、それをコピーして新しいブックマークに追加
      console.log('Comiketter: [Bookmark] Using existing tweet data');
      const existingTweet = existingTweets[0];
      
      // 既存データに video://placeholder や gif://placeholder が含まれている場合は、
      // キャッシュから正しい情報を取得して更新する
      const hasPlaceholder = existingTweet.mediaUrls?.some(url => 
        url === 'video://placeholder' || url === 'gif://placeholder' || url?.includes('://placeholder')
      );
      
      if (hasPlaceholder) {
        console.log('Comiketter: [Bookmark] Existing data has placeholder, fetching from cache');
        try {
          const cachedTweet = await this.sendCacheMessage('findTweetById', {
            id_str: tweetId
          });
          
          if (cachedTweet?.media && Array.isArray(cachedTweet.media) && cachedTweet.media.length > 0) {
            console.log('Comiketter: [Bookmark] Found cachedTweet, using it instead of existing data');
            const mediaExtractor = new MediaExtractor();
            
            const mediaUrls: string[] = [];
            const mediaTypes: string[] = [];
            const mediaPreviewUrls: string[] = [];
            
            for (const m of cachedTweet.media) {
              console.log('Comiketter: [Bookmark] Processing cachedTweet media item:', {
                type: m.type,
                id_str: m.id_str,
                has_video_info: !!m.video_info,
                video_info_variants_count: m.video_info?.variants?.length || 0
              });
              
              mediaTypes.push(m.type || 'photo');
              
              if (m.type === 'video' || m.type === 'animated_gif') {
                const videoUrl = mediaExtractor.getBestVideoUrl(m);
                if (videoUrl) {
                  mediaUrls.push(videoUrl);
                  mediaPreviewUrls.push(m.media_url_https || '');
                } else {
                  mediaUrls.push(m.media_url_https || '');
                  mediaPreviewUrls.push(m.media_url_https || '');
                }
              } else {
                mediaUrls.push(m.media_url_https || '');
                mediaPreviewUrls.push(m.media_url_https || '');
              }
            }
            
            // キャッシュから取得した情報をログに出力して確認
            console.log('Comiketter: [Bookmark] CachedTweet info (existing data):', {
              hasUser: !!cachedTweet.user,
              avatar_url: cachedTweet.user?.avatar_url,
              favorite_count: cachedTweet.favorite_count,
              retweet_count: cachedTweet.retweet_count,
              reply_count: cachedTweet.reply_count,
              hasFullText: !!cachedTweet.full_text,
              hasCreatedAt: !!cachedTweet.created_at
            });
            
            await this.addBookmarkedTweet(
              bookmarkId,
              tweetId,
              cachedTweet.user.screen_name,
              cachedTweet.user.name,
              cachedTweet.user.screen_name,
              cachedTweet.full_text || '',
              cachedTweet.created_at || new Date().toISOString(),
              !!cachedTweet.retweeted_status,
              !!cachedTweet.in_reply_to_status_id_str,
              mediaUrls,
              mediaTypes,
              cachedTweet.in_reply_to_status_id_str,
              cachedTweet.in_reply_to_screen_name,
              'url',
              cachedTweet.user.avatar_url || undefined,
              cachedTweet.favorite_count ?? undefined,
              cachedTweet.retweet_count ?? undefined,
              cachedTweet.reply_count ?? undefined,
              mediaPreviewUrls
            );
            return;
          }
        } catch (error) {
          console.warn('Comiketter: [Bookmark] Failed to get cachedTweet for existing data:', error);
        }
      }
      await this.addBookmarkedTweet(
        bookmarkId,
        tweetId,
        existingTweet.authorUsername,
        existingTweet.authorDisplayName || '',
        existingTweet.authorId || '',
        existingTweet.content,
        existingTweet.tweetDate,
        existingTweet.isRetweet,
        existingTweet.isReply,
        existingTweet.mediaUrls,
        existingTweet.mediaTypes,
        existingTweet.replyToTweetId,
        existingTweet.replyToUsername,
        existingTweet.saveType,
        existingTweet.authorProfileImageUrl,
        existingTweet.favoriteCount,
        existingTweet.retweetCount,
        existingTweet.replyCount,
        existingTweet.mediaPreviewUrls
      );
    } else {
      // ProcessedTweetをキャッシュから取得
      // background script経由でキャッシュから取得
      try {
        const cachedTweet = await this.sendCacheMessage('findTweetById', {
          id_str: tweetId
        });
      
        if (cachedTweet) {
          // ProcessedTweetからメディアURLを抽出
          // MediaExtractorを使用して統一されたロジックで動画URLを取得
          const mediaExtractor = new MediaExtractor();
          
          const mediaUrls: string[] = [];
          const mediaTypes: string[] = [];
          const mediaPreviewUrls: string[] = [];
          
          console.log('Comiketter: [Bookmark] cachedTweet.media:', cachedTweet.media);
          
          if (cachedTweet.media && Array.isArray(cachedTweet.media)) {
            for (const m of cachedTweet.media) {
              console.log('Comiketter: [Bookmark] Processing media item:', {
                type: m.type,
                id_str: m.id_str,
                has_video_info: !!m.video_info,
                video_info_variants_count: m.video_info?.variants?.length || 0,
                media_url_https: m.media_url_https
              });
              
              mediaTypes.push(m.type || 'photo');
              
              // 動画やGIFの場合はMediaExtractorを使用して実際の動画URLを取得
              if (m.type === 'video' || m.type === 'animated_gif') {
                console.log('Comiketter: [Bookmark] Detected video/GIF, extracting video URL...');
                const videoUrl = mediaExtractor.getBestVideoUrl(m);
                console.log('Comiketter: [Bookmark] Extracted video URL:', videoUrl);
                
                if (videoUrl) {
                  mediaUrls.push(videoUrl);
                  // プレビューURLとしてmedia_url_httpsを保存
                  mediaPreviewUrls.push(m.media_url_https || '');
                  console.log('Comiketter: [Bookmark] Added video URL and preview URL');
                } else {
                  // フォールバック: media_url_httpsを使用
                  console.warn('Comiketter: [Bookmark] Failed to extract video URL, using media_url_https as fallback');
                  mediaUrls.push(m.media_url_https || '');
                  mediaPreviewUrls.push(m.media_url_https || '');
                }
              } else {
                // 画像の場合はmedia_url_httpsを使用
                console.log('Comiketter: [Bookmark] Processing as image');
                mediaUrls.push(m.media_url_https || '');
                mediaPreviewUrls.push(m.media_url_https || '');
              }
            }
          } else {
            console.warn('Comiketter: [Bookmark] No media found in cachedTweet');
          }
          
          console.log('Comiketter: [Bookmark] Final media arrays:', {
            mediaUrls,
            mediaTypes,
            mediaPreviewUrls
          });
          
          // ProcessedTweetから情報を抽出して保存
          // キャッシュから取得した情報をログに出力して確認
          console.log('Comiketter: [Bookmark] CachedTweet info:', {
            hasUser: !!cachedTweet.user,
            avatar_url: cachedTweet.user?.avatar_url,
            favorite_count: cachedTweet.favorite_count,
            retweet_count: cachedTweet.retweet_count,
            reply_count: cachedTweet.reply_count,
            hasFullText: !!cachedTweet.full_text,
            hasCreatedAt: !!cachedTweet.created_at
          });
          
          await this.addBookmarkedTweet(
            bookmarkId,
            tweetId,
            cachedTweet.user.screen_name,
            cachedTweet.user.name,
            cachedTweet.user.screen_name, // ProcessedUserにはidがないためscreen_nameを使用
            cachedTweet.full_text || '',
            cachedTweet.created_at || new Date().toISOString(),
            !!cachedTweet.retweeted_status,
            !!cachedTweet.in_reply_to_status_id_str,
            mediaUrls,
            mediaTypes,
            cachedTweet.in_reply_to_status_id_str,
            cachedTweet.in_reply_to_screen_name,
            'url',
            cachedTweet.user.avatar_url || undefined, // undefinedの場合は明示的にundefinedを渡す
            cachedTweet.favorite_count ?? undefined, // null/undefinedの場合はundefinedを渡す
            cachedTweet.retweet_count ?? undefined,
            cachedTweet.reply_count ?? undefined,
            mediaPreviewUrls
          );
        } else if (tweetInfo) {
          // ツイート情報が提供されている場合は、それを使用して新しいブックマーク済みツイートを作成
          console.log('Comiketter: [Bookmark] Using tweetInfo (cachedTweet not found)');
          console.log('Comiketter: [Bookmark] tweetInfo.media:', tweetInfo.media);
          
          // tweetInfoに video://placeholder や gif://placeholder が含まれている場合は、
          // 必ずキャッシュから取得を試みる
          const hasPlaceholder = tweetInfo.media?.some((m: any) => 
            m.url === 'video://placeholder' || 
            m.url === 'gif://placeholder' || 
            m.url?.includes('://placeholder') ||
            m.media_url_https === 'video://placeholder' ||
            m.media_url_https === 'gif://placeholder'
          );
          
          if (hasPlaceholder) {
            console.log('Comiketter: [Bookmark] tweetInfo has placeholder, fetching from cache');
            // キャッシュから再度取得を試みる（タイミングの問題で見つからない場合がある）
            try {
              const retryCachedTweet = await this.sendCacheMessage('findTweetById', {
                id_str: tweetId
              });
              
              if (retryCachedTweet?.media && Array.isArray(retryCachedTweet.media) && retryCachedTweet.media.length > 0) {
                console.log('Comiketter: [Bookmark] Found cachedTweet on retry, using it');
                const mediaExtractor = new MediaExtractor();
                
                const mediaUrls: string[] = [];
                const mediaTypes: string[] = [];
                const mediaPreviewUrls: string[] = [];
                
                for (const m of retryCachedTweet.media) {
                  console.log('Comiketter: [Bookmark] Processing cachedTweet media item:', {
                    type: m.type,
                    id_str: m.id_str,
                    has_video_info: !!m.video_info,
                    video_info_variants_count: m.video_info?.variants?.length || 0
                  });
                  
                  mediaTypes.push(m.type || 'photo');
                  
                  if (m.type === 'video' || m.type === 'animated_gif') {
                    const videoUrl = mediaExtractor.getBestVideoUrl(m);
                    if (videoUrl) {
                      mediaUrls.push(videoUrl);
                      mediaPreviewUrls.push(m.media_url_https || '');
                    } else {
                      mediaUrls.push(m.media_url_https || '');
                      mediaPreviewUrls.push(m.media_url_https || '');
                    }
                  } else {
                    mediaUrls.push(m.media_url_https || '');
                    mediaPreviewUrls.push(m.media_url_https || '');
                  }
                }
                
                // キャッシュから取得した情報をログに出力して確認
                console.log('Comiketter: [Bookmark] RetryCachedTweet info:', {
                  hasUser: !!retryCachedTweet.user,
                  avatar_url: retryCachedTweet.user?.avatar_url,
                  favorite_count: retryCachedTweet.favorite_count,
                  retweet_count: retryCachedTweet.retweet_count,
                  reply_count: retryCachedTweet.reply_count,
                  hasFullText: !!retryCachedTweet.full_text,
                  hasCreatedAt: !!retryCachedTweet.created_at
                });
                
                await this.addBookmarkedTweet(
                  bookmarkId,
                  tweetId,
                  retryCachedTweet.user.screen_name,
                  retryCachedTweet.user.name,
                  retryCachedTweet.user.screen_name,
                  retryCachedTweet.full_text || '',
                  retryCachedTweet.created_at || new Date().toISOString(),
                  !!retryCachedTweet.retweeted_status,
                  !!retryCachedTweet.in_reply_to_status_id_str,
                  mediaUrls,
                  mediaTypes,
                  retryCachedTweet.in_reply_to_status_id_str,
                  retryCachedTweet.in_reply_to_screen_name,
                  'url',
                  retryCachedTweet.user.avatar_url || undefined,
                  retryCachedTweet.favorite_count ?? undefined,
                  retryCachedTweet.retweet_count ?? undefined,
                  retryCachedTweet.reply_count ?? undefined,
                  mediaPreviewUrls
                );
                return;
              } else {
                console.warn('Comiketter: [Bookmark] CachedTweet not found even with placeholder detection');
              }
            } catch (retryError) {
              console.warn('Comiketter: [Bookmark] Retry to get cachedTweet failed:', retryError);
            }
          }
          
          // tweetInfo経由で保存（フォールバック）
          // ただし、placeholderがある場合は保存しない（エラーを出す）
          if (hasPlaceholder) {
            console.error('Comiketter: [Bookmark] Cannot save tweet with placeholder - cachedTweet not found');
            throw new Error('動画情報を取得できませんでした。キャッシュがまだ準備できていない可能性があります。少し時間をおいて再度お試しください。');
          }
          
          console.log('Comiketter: [Bookmark] Falling back to tweetInfo');
          const mediaUrls: string[] = [];
          const mediaTypes: string[] = [];
          const mediaPreviewUrls: string[] = [];
          
          if (tweetInfo.media && Array.isArray(tweetInfo.media)) {
            for (const m of tweetInfo.media) {
              console.log('Comiketter: [Bookmark] Processing tweetInfo media item:', {
                type: m.type,
                url: m.url,
                previewUrl: m.previewUrl,
                media_url_https: m.media_url_https,
                has_video_info: !!m.video_info
              });
              
              // tweetInfo.mediaにはvideo_infoが含まれている可能性がある
              if ((m.type === 'video' || m.type === 'animated_gif' || m.type === 'gif') && m.video_info) {
                console.log('Comiketter: [Bookmark] tweetInfo has video_info, using MediaExtractor');
                const mediaExtractor = new MediaExtractor();
                // ProcessedMedia形式に変換
                const processedMedia = {
                  id_str: m.id || `tweetInfo_${Date.now()}`,
                  type: m.type === 'gif' ? 'animated_gif' : m.type,
                  media_url_https: m.media_url_https || m.url || '',
                  video_info: m.video_info
                };
                const videoUrl = mediaExtractor.getBestVideoUrl(processedMedia);
                if (videoUrl) {
                  mediaUrls.push(videoUrl);
                  mediaTypes.push(m.type === 'gif' ? 'animated_gif' : m.type);
                  mediaPreviewUrls.push(m.previewUrl || m.media_url_https || m.url || '');
                } else {
                  mediaUrls.push(m.url || '');
                  mediaTypes.push(m.type || 'image');
                  mediaPreviewUrls.push(m.previewUrl || m.url || '');
                }
              } else {
                mediaUrls.push(m.url || '');
                mediaTypes.push(m.type || 'image');
                // previewUrlがあればそれを使用、なければurlを使用
                mediaPreviewUrls.push(m.previewUrl || m.url || '');
              }
            }
          }
          
          console.log('Comiketter: [Bookmark] Final media arrays from tweetInfo:', {
            mediaUrls,
            mediaTypes,
            mediaPreviewUrls
          });
          
          // tweetInfoから取得した情報をログに出力して確認
          console.log('Comiketter: [Bookmark] TweetInfo info:', {
            hasAuthor: !!tweetInfo.author,
            profileImageUrl: tweetInfo.author?.profileImageUrl,
            hasStats: !!tweetInfo.stats,
            likeCount: tweetInfo.stats?.likeCount,
            retweetCount: tweetInfo.stats?.retweetCount,
            replyCount: tweetInfo.stats?.replyCount,
            hasText: !!tweetInfo.text,
            hasCreatedAt: !!tweetInfo.createdAt
          });
          
          await this.addBookmarkedTweet(
            bookmarkId,
            tweetId,
            tweetInfo.author?.username || 'unknown',
            tweetInfo.author?.displayName || '',
            tweetInfo.author?.id || '',
            tweetInfo.text || '',
            tweetInfo.createdAt || new Date().toISOString(),
            false, // isRetweet
            false, // isReply
            mediaUrls,
            mediaTypes,
            undefined, // replyToTweetId
            undefined, // replyToUsername
            'url', // saveType
            tweetInfo.author?.profileImageUrl || undefined,
            tweetInfo.stats?.likeCount ?? undefined,
            tweetInfo.stats?.retweetCount ?? undefined,
            tweetInfo.stats?.replyCount ?? undefined,
            mediaPreviewUrls
          );
        } else {
          // ツイート情報がない場合は、最小限の情報で作成
          await this.addBookmarkedTweet(
            bookmarkId,
            tweetId,
            'unknown',
            '',
            '',
            `Tweet ID: ${tweetId}`,
            new Date().toISOString(),
            false,
            false,
            [],
            [],
            undefined,
            undefined,
            'url',
            undefined,
            undefined,
            undefined,
            undefined,
            []
          );
        }
      } catch (error) {
        console.error('Comiketter: Failed to get cached tweet:', error);
        // エラーが発生した場合でも、tweetInfoがあればそれを使用
        if (tweetInfo) {
          // メディア情報を抽出（プレビューURLはpreviewUrlを使用）
          const mediaUrls: string[] = [];
          const mediaTypes: string[] = [];
          const mediaPreviewUrls: string[] = [];
          
          if (tweetInfo.media && Array.isArray(tweetInfo.media)) {
            for (const m of tweetInfo.media) {
              mediaUrls.push(m.url || '');
              mediaTypes.push(m.type || 'image');
              // previewUrlがあればそれを使用、なければurlを使用
              mediaPreviewUrls.push(m.previewUrl || m.url || '');
            }
          }
          
          // tweetInfoから取得した情報をログに出力して確認（エラー時）
          console.log('Comiketter: [Bookmark] TweetInfo info (error fallback):', {
            hasAuthor: !!tweetInfo.author,
            profileImageUrl: tweetInfo.author?.profileImageUrl,
            hasStats: !!tweetInfo.stats,
            likeCount: tweetInfo.stats?.likeCount,
            retweetCount: tweetInfo.stats?.retweetCount,
            replyCount: tweetInfo.stats?.replyCount,
            hasText: !!tweetInfo.text,
            hasCreatedAt: !!tweetInfo.createdAt
          });
          
          await this.addBookmarkedTweet(
            bookmarkId,
            tweetId,
            tweetInfo.author?.username || 'unknown',
            tweetInfo.author?.displayName || '',
            tweetInfo.author?.id || '',
            tweetInfo.text || '',
            tweetInfo.createdAt || new Date().toISOString(),
            false,
            false,
            mediaUrls,
            mediaTypes,
            undefined,
            undefined,
            'url',
            tweetInfo.author?.profileImageUrl || undefined,
            tweetInfo.stats?.likeCount ?? undefined,
            tweetInfo.stats?.retweetCount ?? undefined,
            tweetInfo.stats?.replyCount ?? undefined,
            mediaPreviewUrls
          );
        } else {
          // tweetInfoもない場合は、最小限の情報で作成
          await this.addBookmarkedTweet(
            bookmarkId,
            tweetId,
            'unknown',
            '',
            '',
            `Tweet ID: ${tweetId}`,
            new Date().toISOString(),
            false,
            false,
            [],
            [],
            undefined,
            undefined,
            'url',
            undefined,
            undefined,
            undefined,
            undefined,
            []
          );
        }
      }
    }
  }

  /**
   * ブックマークからツイートを削除
   */
  async removeTweetFromBookmark(bookmarkId: string, tweetId: string): Promise<void> {
    const bookmarkedTweets = await this.getBookmarkedTweetByTweetId(tweetId);
    const targetTweet = bookmarkedTweets.find(tweet => tweet.bookmarkId === bookmarkId);
    
    if (targetTweet) {
      await this.deleteBookmarkedTweet(targetTweet.id);
    }
  }

  /**
   * ツイートに関連するブックマークを取得
   */
  async getBookmarksForTweet(tweetId: string): Promise<CustomBookmark[]> {
    const bookmarkedTweets = await this.getBookmarkedTweetByTweetId(tweetId);
    const bookmarkIds = [...new Set(bookmarkedTweets.map(tweet => tweet.bookmarkId))];
    
    const allBookmarks = await this.getBookmarks();
    return allBookmarks.filter(bookmark => bookmarkIds.includes(bookmark.id));
  }

  /**
   * ブックマークを検索
   */
  async searchBookmarks(query: string): Promise<CustomBookmark[]> {
    const bookmarks = await this.getBookmarks();
    const lowerQuery = query.toLowerCase();
    return bookmarks.filter(bookmark => 
      bookmark.name.toLowerCase().includes(lowerQuery) ||
      (bookmark.description && bookmark.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * ブックマークをソート
   */
  async sortBookmarks(bookmarks: CustomBookmark[], sortBy: 'name' | 'createdAt' | 'updatedAt' = 'name'): Promise<CustomBookmark[]> {
    return [...bookmarks].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'createdAt':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'updatedAt':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        default:
          return 0;
      }
    });
  }

  /**
   * ブックマーク名を検証
   */
  async validateBookmark(name: string, excludeId?: string): Promise<{ isValid: boolean; error?: string }> {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: 'ブックマーク名は必須です' };
    }
    
    if (name.length > 50) {
      return { isValid: false, error: 'ブックマーク名は50文字以内で入力してください' };
    }
    
    // 重複チェック
    const bookmarks = await this.getBookmarks();
    const existingBookmark = bookmarks.find(b => 
      b.name.toLowerCase() === name.toLowerCase() && b.id !== excludeId
    );
    
    if (existingBookmark) {
      return { isValid: false, error: '同じ名前のブックマークが既に存在します' };
    }
    
    return { isValid: true };
  }

  /**
   * ブックマークデータをクリア
   */
  async clearAllData(): Promise<void> {
    return await this.sendMessage('clearBookmarkData');
  }
} 