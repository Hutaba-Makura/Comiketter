/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Modified and adapted from TwitterMediaHarvest article.ts
 */

export interface TweetInfo {
  tweetId: string;
  screenName: string;
  hasMedia: boolean;
  mediaUrls?: string[];
}

/**
 * ツイート要素からツイート情報を抽出
 */
export function getTweetInfoFromArticle(article: HTMLElement): TweetInfo | null {
  try {
    const tweetId = extractTweetId(article);
    const screenName = extractScreenName(article);
    const hasMedia = checkHasMedia(article);
    const mediaUrls = hasMedia ? extractMediaUrls(article) : undefined;

    if (!tweetId || !screenName) {
      console.warn('Comiketter: Failed to extract tweet info - missing tweetId or screenName');
      return null;
    }

    return {
      tweetId,
      screenName,
      hasMedia,
      mediaUrls,
    };
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
  ];

  for (const selector of selectors) {
    const element = article.querySelector(selector);
    if (element) {
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

  return null;
}

/**
 * メディアの存在をチェック
 */
function checkHasMedia(article: HTMLElement): boolean {
  // 画像の存在チェック
  const hasImage = article.querySelector('[data-testid="tweetPhoto"]') !== null;
  
  // 動画の存在チェック
  const hasVideo = article.querySelector('[data-testid="videoPlayer"]') !== null ||
                  article.querySelector('[data-testid="playButton"]') !== null;
  
  // 引用ツイート内のメディアは除外
  const isInQuotedTweet = article.closest('[role="link"]') !== null;
  
  return (hasImage || hasVideo) && !isInQuotedTweet;
}

/**
 * メディアURLを抽出
 */
function extractMediaUrls(article: HTMLElement): string[] {
  const mediaUrls: string[] = [];

  // 画像URLを抽出
  const images = article.querySelectorAll('img[src*="pbs.twimg.com"]');
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src && !mediaUrls.includes(src)) {
      // 高解像度版のURLに変換
      const highResUrl = src.replace(/&name=\w+/, '&name=orig');
      mediaUrls.push(highResUrl);
    }
  });

  // 動画URLを抽出（API傍受で取得されるため、ここではプレースホルダー）
  const videos = article.querySelectorAll('[data-testid="videoPlayer"], [data-testid="playButton"]');
  if (videos.length > 0) {
    // 動画URLはAPI傍受で取得されるため、ここでは空配列を返す
    // 実際のURLは background/apiInterceptor.ts で取得される
  }

  return mediaUrls;
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