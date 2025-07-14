/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Modified and adapted from TwitterMediaHarvest article.ts
 */

/// <reference lib="dom" />

import type { Tweet } from '../types';

// グローバル型定義
declare global {
  interface HTMLElement {
    matches(selector: string): boolean;
    closest(selector: string): HTMLElement | null;
    querySelector(selector: string): HTMLElement | null;
    querySelectorAll(selector: string): NodeListOf<HTMLElement>;
    getAttribute(name: string): string | null;
    setAttribute(name: string, value: string): void;
    textContent: string | null;
  }
}

/**
 * ツイート要素からツイート情報を抽出
 */
export function getTweetInfoFromArticle(article: HTMLElement): Tweet | null {
  try {
    const tweetId = extractTweetId(article);
    const screenName = extractScreenName(article);
    const displayName = extractDisplayName(article);
    const hasMedia = checkHasMedia(article);
    const mediaUrls = hasMedia ? extractMediaUrls(article) : undefined;
    const hasVideo = checkHasVideo(article);
    const createdAt = extractCreatedAt(article);
    const text = extractText(article);

    console.log('Comiketter: Extracted tweet info:', {
      tweetId,
      screenName,
      hasMedia,
      hasVideo,
      mediaUrls: mediaUrls?.length || 0
    });

    if (!tweetId || !screenName) {
      console.warn('Comiketter: Failed to extract tweet info - missing tweetId or screenName');
      return null;
    }

    // メディア情報を構築
    let media;
    if (mediaUrls && mediaUrls.length > 0) {
      // 画像がある場合は画像として追加
      media = mediaUrls.map(url => ({
        type: 'image' as const,
        url,
        originalUrl: url,
      }));
    } else if (hasVideo) {
      // 動画がある場合はダミーエントリを追加（実際のURLはAPI傍受で取得）
      media = [{
        type: 'video' as const,
        url: 'video://placeholder',
        originalUrl: 'video://placeholder',
      }];
    }

    const result = {
      id: tweetId,
      text: text || '',
      author: {
        username: screenName,
        displayName: displayName || screenName,
        profileImageUrl: undefined,
      },
      createdAt: createdAt || new Date().toISOString(),
      media,
      url: `https://twitter.com/${screenName}/status/${tweetId}`,
    };

    console.log('Comiketter: Final tweet info:', {
      id: result.id,
      hasMedia: !!result.media,
      hasVideo,
      mediaLength: result.media?.length || 0
    });

    return result;
  } catch (error) {
    console.error('Comiketter: Error extracting tweet info:', error);
    return null;
  }
}

/**
 * ツイートIDを抽出
 */
function extractTweetId(article: HTMLElement): string | null {
  // 複数の方法でツイートIDを取得
  const selectors = [
    'a[href*="/status/"]',
    '[data-testid="User-Name"] a[href*="/status/"]',
    'time[datetime]',
    '[data-testid="tweet"] a[href*="/status/"]',
  ];

  for (const selector of selectors) {
    const elements = article.querySelectorAll(selector);
    for (const element of elements) {
      const href = element.getAttribute('href');
      if (href) {
        const match = href.match(/\/status\/(\d+)/);
        if (match) {
          return match[1];
        }
      }
    }
  }

  // データ属性から取得を試行
  const tweetElement = article.querySelector('[data-testid="tweet"]');
  if (tweetElement) {
    const dataTweetId = tweetElement.getAttribute('data-tweet-id');
    if (dataTweetId) {
      return dataTweetId;
    }
  }

  // 記事要素自体の属性から取得を試行
  const articleTweetId = article.getAttribute('data-tweet-id');
  if (articleTweetId) {
    return articleTweetId;
  }

  return null;
}

/**
 * スクリーンネームを抽出
 */
function extractScreenName(article: HTMLElement): string | null {
  // ユーザー名要素から取得
  const userNameElement = article.querySelector('[data-testid="User-Name"]');
  if (userNameElement) {
    const links = userNameElement.querySelectorAll('a[href]');
    for (const link of links) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/')) {
        const match = href.match(/^\/([^\/]+)/);
        if (match) {
          return match[1];
        }
      }
    }
  }

  // 直接リンクから取得
  const links = article.querySelectorAll('a[href*="/status/"]');
  for (const link of links) {
    const href = link.getAttribute('href');
    if (href) {
      const match = href.match(/^\/([^\/]+)\/status\//);
      if (match) {
        return match[1];
      }
    }
  }

  // ユーザーリンクから取得
  const userLinks = article.querySelectorAll('a[href^="/"]');
  for (const link of userLinks) {
    const href = link.getAttribute('href');
    if (href && href.match(/^\/[^\/]+\/?$/)) {
      const match = href.match(/^\/([^\/]+)/);
      if (match && match[1] !== 'status' && match[1] !== 'i' && match[1] !== 'home') {
        return match[1];
      }
    }
  }

  return null;
}

/**
 * 表示名を抽出
 */
function extractDisplayName(article: HTMLElement): string | null {
  const userNameElement = article.querySelector('[data-testid="User-Name"]');
  if (userNameElement) {
    const displayNameElement = userNameElement.querySelector('span');
    if (displayNameElement) {
      return displayNameElement.textContent?.trim() || null;
    }
  }
  return null;
}

/**
 * ツイート本文を抽出
 */
function extractText(article: HTMLElement): string | null {
  const textElement = article.querySelector('[data-testid="tweetText"]');
  if (textElement) {
    return textElement.textContent?.trim() || null;
  }
  return null;
}

/**
 * 作成日時を抽出
 */
function extractCreatedAt(article: HTMLElement): string | null {
  const timeElement = article.querySelector('time[datetime]');
  if (timeElement) {
    const datetime = timeElement.getAttribute('datetime');
    if (datetime) {
      return datetime;
    }
  }
  return null;
}

/**
 * メディアの存在をチェック
 */
function checkHasMedia(article: HTMLElement): boolean {
  // 画像の存在チェック（プロフィール画像とバナー画像を除外）
  // より具体的なセレクターを使用してツイート内の画像を検出
  const images = article.querySelectorAll('img[src*="pbs.twimg.com/media/"]');
  let hasValidImage = false;
  
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src) {
      // プロフィール画像とバナー画像を除外
      if (!isProfileOrBannerImage(src) && !isVideoThumbnail(src)) {
        hasValidImage = true;
        console.log('Comiketter: Valid image found:', src);
      } else {
        console.log('Comiketter: Excluded image:', src, {
          isProfile: isProfileOrBannerImage(src),
          isVideoThumbnail: isVideoThumbnail(src)
        });
      }
    }
  });
  
  // 画像が見つからない場合は、より広い範囲で検索
  if (!hasValidImage) {
    const allImages = article.querySelectorAll('img[src*="pbs.twimg.com"]');
    allImages.forEach(img => {
      const src = img.getAttribute('src');
      if (src && src.includes('/media/') && !isProfileOrBannerImage(src) && !isVideoThumbnail(src)) {
        hasValidImage = true;
        console.log('Comiketter: Valid image found (fallback):', src);
      }
    });
  }
  
  // 動画の存在チェック
  const hasVideo = article.querySelector('[data-testid="videoPlayer"]') !== null ||
                  article.querySelector('[data-testid="playButton"]') !== null;
  
  // 引用ツイート内のメディアは除外
  const isInQuotedTweet = article.closest('[role="link"]') !== null;
  
  const hasMedia = hasValidImage || hasVideo;
  
  console.log('Comiketter: Media check result:', {
    hasValidImage,
    hasVideo,
    isInQuotedTweet,
    hasMedia,
    totalImages: images.length
  });
  
  return hasMedia && !isInQuotedTweet;
}

/**
 * メディアURLを抽出（TwitterMediaHarvest準拠）
 */
function extractMediaUrls(article: HTMLElement): string[] {
  const mediaUrls: string[] = [];

  // 画像URLを抽出（プロフィール画像とバナー画像を除外）
  const images = article.querySelectorAll('img[src*="pbs.twimg.com/media/"]');
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src && !mediaUrls.includes(src)) {
      // プロフィール画像とバナー画像を除外
      if (isProfileOrBannerImage(src)) {
        console.log('Comiketter: Excluding profile/banner image:', src);
        return;
      }
      
      // 動画サムネイルを除外
      if (isVideoThumbnail(src)) {
        console.log('Comiketter: Excluding video thumbnail:', src);
        return;
      }
      
      // 高解像度版のURLに変換
      const highResUrl = src.replace(/&name=\w+/, '&name=orig');
      mediaUrls.push(highResUrl);
    }
  });

  // 動画URLはAPI傍受で取得されるため、ここでは追加しない
  // 実際の動画URLは background/downloadManager.ts の extractMediaFromTweet で取得される
  const videos = article.querySelectorAll('[data-testid="videoPlayer"], [data-testid="playButton"]');
  if (videos.length > 0) {
    console.log('Comiketter: Video detected, but URL will be extracted from API response');
  }

  return mediaUrls;
}

/**
 * プロフィール画像やバナー画像かどうかを判定
 */
function isProfileOrBannerImage(url: string): boolean {
  const urlLower = url.toLowerCase();
  
  // プロフィール画像のパターン
  const profilePatterns = [
    '/profile_images/',
    '/profile_banners/',
    '/profile_images_normal/',
    '/profile_images_bigger/',
    '/profile_images_mini/',
  ];
  
  // バナー画像のパターン
  const bannerPatterns = [
    '/profile_banners/',
    '/banner_images/',
  ];
  
  return profilePatterns.some(pattern => urlLower.includes(pattern)) ||
         bannerPatterns.some(pattern => urlLower.includes(pattern));
}

/**
 * 動画の存在をチェック
 */
function checkHasVideo(article: HTMLElement): boolean {
  // 動画プレイヤーや再生ボタンの存在をチェック
  const hasVideo = article.querySelector('[data-testid="videoPlayer"]') !== null ||
                  article.querySelector('[data-testid="playButton"]') !== null;
  
  console.log('Comiketter: Video check result:', { hasVideo });
  
  return hasVideo;
}

/**
 * 動画サムネイルかどうかを判定
 */
function isVideoThumbnail(url: string): boolean {
  const urlLower = url.toLowerCase();
  
  // 動画サムネイルのパターン（より具体的に）
  const thumbnailPatterns = [
    'ext_tw_video_thumb',
    'video_thumb',
  ];
  
  return thumbnailPatterns.some(pattern => urlLower.includes(pattern));
}

/**
 * ツイート要素が有効かチェック
 */
export function isValidTweetElement(element: HTMLElement): boolean {
  return element.matches('article[data-testid="tweet"]') &&
         !element.querySelector('.comiketter-download-button');
}

/**
 * ツイート要素から親ツイートを取得
 */
export function getParentTweet(element: HTMLElement): HTMLElement | null {
  return element.closest('article[data-testid="tweet"]');
}