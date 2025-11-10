/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ツイート情報抽出機能
 * TwitterMediaHarvestのtweetInfoExtractor.tsを参考
 */

// TypeScriptの型定義拡張
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

import type { Tweet } from '../types';

/**
 * ツイート要素からツイート情報を抽出
 */
export function getTweetInfoFromArticle(article: HTMLElement): Tweet | null {
  try {
    const tweetId = extractTweetId(article);
    const screenName = extractScreenName(article);
    const displayName = extractDisplayName(article);
    const hasImage = checkHasImage(article);
    const mediaUrls = hasImage ? extractMediaUrls(article) : undefined;
    const hasVideo = checkHasVideo(article);
    const hasGif = checkHasGif(article);
    const createdAt = extractCreatedAt(article);
    const text = extractText(article);

    if (!tweetId || !screenName) {
      console.warn('Comiketter: Failed to extract tweet info - missing tweetId or screenName');
      return null;
    }

    // メディア情報を構築
    let media;
    if (hasImage && mediaUrls && mediaUrls.length > 0) {
      // 画像がある場合は画像として追加
      media = mediaUrls.map(url => ({
        type: 'image' as const,
        url,
        originalUrl: url,
        // ProcessedMediaとの互換性のため、media_url_httpsも追加
        media_url_https: url,
      }));
    } else if (hasVideo) {
      // 動画がある場合はダミーエントリを追加（実際のURLはAPI傍受で取得）
      media = [{
        type: 'video' as const,
        url: 'video://placeholder',
        originalUrl: 'video://placeholder',
        // ProcessedMediaとの互換性のため、media_url_httpsも追加
        media_url_https: 'video://placeholder',
      }];
    } else if (hasGif) {
      // GIFがある場合はダミーエントリを追加
      media = [{
        type: 'animated_gif' as const,
        url: 'gif://placeholder',
        originalUrl: 'gif://placeholder',
        // ProcessedMediaとの互換性のため、media_url_httpsも追加
        media_url_https: 'gif://placeholder',
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

    return result;
  } catch (error) {
    console.error('Comiketter: Error extracting tweet info:', error);
    return null;
  }
}

/**
 * TwitterMediaHarvestスタイルのツイート情報抽出
 * キャッシュにツイートが見つからない場合のフォールバック機能
 */
export function extractTweetInfoFromDOM(tweetId: string): Tweet | null {
  try {
    // ツイートIDから該当するarticle要素を検索
    const article = findArticleByTweetId(tweetId);
    if (!article) {
      console.warn(`Comiketter: Article not found for tweet ID: ${tweetId}`);
      return null;
    }

    return getTweetInfoFromArticle(article);
  } catch (error) {
    console.error('Comiketter: Error extracting tweet info from DOM:', error);
    return null;
  }
}

/**
 * ツイートIDから該当するarticle要素を検索
 */
function findArticleByTweetId(tweetId: string): HTMLElement | null {
  // 複数の方法でツイート要素を検索
  const selectors = [
    `a[href*="/status/${tweetId}"]`,
    `[data-testid="tweet"][data-tweet-id="${tweetId}"]`,
    `article[data-tweet-id="${tweetId}"]`,
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      // 親のarticle要素を取得
      const article = element.closest('article');
      if (article) {
        return article;
      }
    }
  }

  // より広範囲な検索
  const allArticles = document.querySelectorAll('article');
  for (const article of allArticles) {
    const links = article.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const href = link.getAttribute('href');
      if (href && href.includes(`/status/${tweetId}`)) {
        return article;
      }
    }
  }

  return null;
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
 * 引用ツイートのメディアコンテナ（G要素）を取得
 * @param article - ツイート全体の <article data-testid="tweet">
 * @returns 引用ツイートのメディアコンテナ要素の配列
 */
function getQuotedTweetContainers(article: HTMLElement): HTMLElement[] {
  const containers: HTMLElement[] = [];
  
  // "引用"というテキストを持つspan要素をすべて検索
  const allSpans = article.querySelectorAll('span');
  allSpans.forEach(span => {
    const text = (span.textContent || '').trim();
    if (text === '引用') {
      // 親要素（P）を取得
      const parentP = span.parentElement;
      if (parentP) {
        // Pがdir="ltr"を持たない場合は間違った要素なのでスキップ
        if (parentP.getAttribute('dir') !== 'ltr') {
          return;
        }
        
        // Pの親要素（G）を取得
        const grandparentG = parentP.parentElement;
        if (grandparentG) {
          containers.push(grandparentG);
        }
      }
    }
  });
  
  return containers;
}

/**
 * 要素が引用ツイート内にあるかを判定
 * @param element - 判定したい要素
 * @param quotedContainers - 引用ツイートのメディアコンテナ要素の配列
 * @returns 引用ツイート内にある場合はtrue
 */
function isInQuotedTweet(element: HTMLElement, quotedContainers: HTMLElement[]): boolean {
  return quotedContainers.some(container => container.contains(element));
}

/**
 * 画像の存在をチェック（引用リツイート内の画像は除外）
 */
function checkHasImage(article: HTMLElement): boolean {
  // 引用ツイートのメディアコンテナを取得
  const quotedContainers = getQuotedTweetContainers(article);
  
  // 画像の存在チェック（プロフィール画像とバナー画像を除外）
  // より具体的なセレクターを使用してツイート内の画像を検出
  const images = article.querySelectorAll('img[src*="pbs.twimg.com/media/"]');
  let hasValidImage = false;
  
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src) {
      // プロフィール画像とバナー画像を除外
      if (!isProfileOrBannerImage(src) && !isVideoThumbnail(src)) {
        // 引用ツイート内の画像は除外
        if (!isInQuotedTweet(img as HTMLElement, quotedContainers)) {
          hasValidImage = true;
        }
      }
    }
  });
  
  // 画像が見つからない場合は、より広い範囲で検索
  if (!hasValidImage) {
    const allImages = article.querySelectorAll('img[src*="pbs.twimg.com"]');
    allImages.forEach(img => {
      const src = img.getAttribute('src');
      if (src && src.includes('/media/') && !isProfileOrBannerImage(src) && !isVideoThumbnail(src)) {
        // 引用ツイート内の画像は除外
        if (!isInQuotedTweet(img as HTMLElement, quotedContainers)) {
          hasValidImage = true;
        }
      }
    });
  }
  
  // 動画の存在チェック（引用ツイート内の動画は除外）
  const videoElements = article.querySelectorAll('[data-testid="videoPlayer"], [data-testid="playButton"]');
  let hasVideo = false;
  videoElements.forEach(video => {
    if (!isInQuotedTweet(video as HTMLElement, quotedContainers)) {
      hasVideo = true;
    }
  });
  
  // GIFの存在チェック（引用ツイート内のGIFは除外）
  const gifElements = article.querySelectorAll('[data-testid="videoPlayer"] video[src*=".mp4"], video[src*=".mp4"]');
  let hasGif = false;
  gifElements.forEach(gif => {
    if (!isInQuotedTweet(gif as HTMLElement, quotedContainers)) {
      hasGif = true;
    }
  });
  
  const hasMedia = hasValidImage || hasVideo || hasGif;
  
  return hasMedia;
}

/**
 * メディアURLを抽出（TwitterMediaHarvest準拠）
 */
function extractMediaUrls(article: HTMLElement): string[] {
  const mediaUrls: string[] = [];
  
  // 引用ツイートのメディアコンテナを取得
  const quotedContainers = getQuotedTweetContainers(article);

  // 画像URLを抽出（プロフィール画像とバナー画像を除外）
  const images = article.querySelectorAll('img[src*="pbs.twimg.com/media/"]');
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src && !mediaUrls.includes(src)) {
      // プロフィール画像とバナー画像を除外
      if (isProfileOrBannerImage(src)) {
        return;
      }
      
      // 動画サムネイルを除外
      if (isVideoThumbnail(src)) {
        return;
      }
      
      // 引用ツイート内の画像は除外
      if (isInQuotedTweet(img as HTMLElement, quotedContainers)) {
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
  videos.forEach(video => {
    // 引用ツイート内の動画は除外
    if (!isInQuotedTweet(video as HTMLElement, quotedContainers)) {
      // 動画の場合はプレースホルダーを追加（重複チェック）
      if (!mediaUrls.includes('video://placeholder')) {
        mediaUrls.push('video://placeholder');
      }
    }
  });

  return mediaUrls;
}

/**
 * 動画の存在をチェック（引用ツイート内の動画は除外）
 */
function checkHasVideo(article: HTMLElement): boolean {
  // 引用ツイートのメディアコンテナを取得
  const quotedContainers = getQuotedTweetContainers(article);
  
  // 動画プレイヤーや再生ボタンの存在をチェック
  const videoElements = article.querySelectorAll('[data-testid="videoPlayer"], [data-testid="playButton"]');
  for (let i = 0; i < videoElements.length; i++) {
    const video = videoElements[i] as HTMLElement;
    // 引用ツイート内の動画は除外
    if (!isInQuotedTweet(video, quotedContainers)) {
      return true;
    }
  }
  
  return false;
}

/**
 * GIFの存在をチェック（引用ツイート内のGIFは除外）
 */
function checkHasGif(article: HTMLElement): boolean {
  // 引用ツイートのメディアコンテナを取得
  const quotedContainers = getQuotedTweetContainers(article);
  
  // GIF動画の存在をチェック
  const gifElements = article.querySelectorAll('[data-testid="videoPlayer"] video[src*=".mp4"], video[src*=".mp4"]');
  for (let i = 0; i < gifElements.length; i++) {
    const gif = gifElements[i] as HTMLElement;
    // 引用ツイート内のGIFは除外
    if (!isInQuotedTweet(gif, quotedContainers)) {
      return true;
    }
  }
  
  return false;
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
 * 有効なツイート要素かどうかを判定
 */
export function isValidTweetElement(element: HTMLElement): boolean {
  return element.matches('article[data-testid="tweet"]') &&
         !element.querySelector('.comiketter-download-button');
}

/**
 * 親のツイート要素を取得
 */
export function getParentTweet(element: HTMLElement): HTMLElement | null {
  if (element.tagName === 'ARTICLE') {
    return element;
  }
  return element.closest('article');
}

/**
 * メディアタイプを判定
 */
export function getMediaType(article: HTMLElement): 'image' | 'video' | 'animated_gif' | null {
  if (checkHasVideo(article)) {
    return 'video';
  }
  if (checkHasGif(article)) {
    return 'animated_gif';
  }
  if (checkHasImage(article)) {
    return 'image';
  }
  return null;
}

