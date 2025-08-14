/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ツイート情報抽出機能
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
    const hasMedia = checkHasMedia(article);
    const mediaUrls = hasMedia ? extractMediaUrls(article) : undefined;
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
    if (mediaUrls && mediaUrls.length > 0) {
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
 * メディアの存在をチェック
 */
/* TODO: 引用リツイート元も除外する処理を追加する */
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
        if (!isQuoteTweet(article, img as HTMLImageElement)) {
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
        hasValidImage = true;
      }
    });
  }
  
  // 動画の存在チェック
  const hasVideo = article.querySelector('[data-testid="videoPlayer"]') !== null ||
                  article.querySelector('[data-testid="playButton"]') !== null;
  
  // GIFの存在チェック
  const hasGif = article.querySelector('[data-testid="videoPlayer"] video[src*=".mp4"]') !== null ||
                 article.querySelector('video[src*=".mp4"]') !== null;
  
  // 引用ツイート内のメディアは除外
  const isInQuotedTweet = article.closest('[role="link"]') !== null;
  
  const hasMedia = hasValidImage || hasVideo || hasGif;
  
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
        return;
      }
      
      // 動画サムネイルを除外
      if (isVideoThumbnail(src)) {
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
    // 動画の場合はプレースホルダーを追加
    mediaUrls.push('video://placeholder');
  }

  return mediaUrls;
}

/**
 * 動画の存在をチェック
 */
function checkHasVideo(article: HTMLElement): boolean {
  // 動画プレイヤーや再生ボタンの存在をチェック
  const hasVideo = article.querySelector('[data-testid="videoPlayer"]') !== null ||
                  article.querySelector('[data-testid="playButton"]') !== null;
  
  return hasVideo;
}

/**
 * GIFの存在をチェック
 */
function checkHasGif(article: HTMLElement): boolean {
  // GIF動画の存在をチェック
  const hasGif = article.querySelector('[data-testid="videoPlayer"] video[src*=".mp4"]') !== null ||
                 article.querySelector('video[src*=".mp4"]') !== null;
  
  return hasGif;
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
  if (checkHasMedia(article)) {
    return 'image';
  }
  return null;
}

/**
 * 画像要素が「引用RT 側カード」に属しているなら true を返す
 * @param article - ツイート全体の <article data-testid="tweet">
 * @param img - 判定したい画像要素
 */
export function isQuoteTweet(article: HTMLElement, img: HTMLImageElement): boolean {
  if (!article || !img) return false;

  // 画像のカード要素を取得
  const card = img.closest('[data-testid="tweetPhoto"]')?.closest('[role="link"]') as HTMLElement | null;
  if (!card) return false;

  // 引用ラベルを検索する関数
  const hasQuoteLabel = (element: Element): boolean => {
    const text = (element.textContent || '').trim();
    return /引用|Quoted/i.test(text);
  };

  // 1. aria-labelledby による引用セクション判定
  const section = card.closest('[aria-labelledby]') as HTMLElement | null;
  if (section) {
    const cssEscape = (window as any).CSS?.escape ?? ((s: string) => s.replace(/[^a-zA-Z0-9_\-]/g, '\\$&'));
    const labelledBy = section.getAttribute('aria-labelledby') ?? '';
    const hasLabel = labelledBy.split(/\s+/).filter(Boolean)
      .some(id => {
        const labelEl = section.querySelector('#' + cssEscape(id)) as HTMLElement | null;
        return labelEl && hasQuoteLabel(labelEl);
      });
    if (hasLabel) return true;
  }

  // 2. フォールバック: 近傍要素の引用ラベル判定
  const checkNearbyElements = (start: Element): boolean => {
    // 直前の兄弟要素をチェック
    for (let el = start.previousElementSibling; el; el = el.previousElementSibling) {
      if (hasQuoteLabel(el)) return true;
    }
    // 親の兄弟要素もチェック
    const parent = start.parentElement;
    if (parent) {
      for (let el = parent.previousElementSibling; el; el = el.previousElementSibling) {
        if (hasQuoteLabel(el)) return true;
      }
    }
    return false;
  };

  return checkNearbyElements(card);
}
