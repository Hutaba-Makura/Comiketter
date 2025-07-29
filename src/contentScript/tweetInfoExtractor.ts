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
 * TwitterMediaHarvestスタイルのリンク抽出
 */
function getLinksFromArticle(article: HTMLElement): string[] {
  const links: string[] = [];
  
  // User-Nameセクションからリンクを取得
  const userNameSection = article.querySelector('[data-testid="User-Name"]');
  if (userNameSection) {
    const anchors = userNameSection.querySelectorAll('a[href]');
    anchors.forEach(anchor => {
      const href = anchor.getAttribute('href');
      if (href) links.push(href);
    });
  }

  // 時間要素からリンクを取得
  const timeElement = article.querySelector('a > time');
  if (timeElement?.parentElement?.tagName === 'A') {
    const href = timeElement.parentElement.getAttribute('href');
    if (href) links.push(href);
  }

  return links.filter(link => link && link.length > 0);
}

/**
 * リンクからツイートIDを抽出
 */
function getTweetIdFromLink(link: string): string | null {
  const match = link.match(/(?:status\/)(\d+)/);
  return match ? match[1] : null;
}

/**
 * リンクからスクリーンネームを抽出
 */
function getScreenNameFromLink(link: string): string | null {
  const match = link.match(/(\w+)\/(?:status\/)/);
  return match ? match[1] : null;
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

  // 代替方法: リンクから直接抽出
  const links = article.querySelectorAll('a[href*="/status/"]');
  for (const link of links) {
    const href = link.getAttribute('href');
    if (href) {
      const match = href.match(/([^\/]+)\/status\//);
      if (match) {
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
    // 表示名は通常、span要素に含まれている
    const spans = userNameElement.querySelectorAll('span');
    for (const span of spans) {
      const text = span.textContent?.trim();
      if (text && text.length > 0 && !text.startsWith('@')) {
        return text;
      }
    }
  }
  return null;
}

/**
 * ツイートテキストを抽出
 */
function extractText(article: HTMLElement): string | null {
  // ツイートテキスト要素を検索
  const textSelectors = [
    '[data-testid="tweetText"]',
    '[lang]', // 言語属性を持つ要素（通常テキスト）
    'div[dir="ltr"]', // 左から右のテキスト方向
  ];

  for (const selector of textSelectors) {
    const elements = article.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent?.trim();
      if (text && text.length > 0) {
        return text;
      }
    }
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
 * メディアの有無をチェック
 */
function checkHasMedia(article: HTMLElement): boolean {
  // 画像要素をチェック
  const imageSelectors = [
    '[data-testid="tweetPhoto"]',
    'img[src*="pbs.twimg.com"]',
    '[data-testid="image"]',
  ];

  for (const selector of imageSelectors) {
    if (article.querySelector(selector)) {
      return true;
    }
  }

  // 動画要素をチェック
  const videoSelectors = [
    '[data-testid="videoPlayer"]',
    'video',
    '[data-testid="video"]',
  ];

  for (const selector of videoSelectors) {
    if (article.querySelector(selector)) {
      return true;
    }
  }

  return false;
}

/**
 * メディアURLを抽出
 */
function extractMediaUrls(article: HTMLElement): string[] {
  const urls: string[] = [];

  // 画像URLを抽出
  const images = article.querySelectorAll('img[src*="pbs.twimg.com"]');
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src && !isProfileOrBannerImage(src)) {
      urls.push(src);
    }
  });

  return urls;
}

/**
 * 動画の有無をチェック
 */
function checkHasVideo(article: HTMLElement): boolean {
  const videoSelectors = [
    '[data-testid="videoPlayer"]',
    'video',
    '[data-testid="video"]',
    '[data-testid="videoPlayer"] video',
  ];

  for (const selector of videoSelectors) {
    if (article.querySelector(selector)) {
      return true;
    }
  }

  return false;
}

/**
 * プロフィール画像やバナー画像かどうかを判定
 */
function isProfileOrBannerImage(url: string): boolean {
  const profilePatterns = [
    'profile_images',
    'profile_banners',
    'banner_images',
    '_normal',
    '_bigger',
    '_mini',
  ];

  return profilePatterns.some(pattern => url.includes(pattern));
}

/**
 * 動画サムネイルかどうかを判定
 */
function isVideoThumbnail(url: string): boolean {
  return url.includes('tweet_video_thumb') || url.includes('video_thumb');
}

/**
 * 有効なツイート要素かどうかを判定
 */
export function isValidTweetElement(element: HTMLElement): boolean {
  return element.tagName === 'ARTICLE' || element.closest('article') !== null;
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