/**
 * TwitterメディアURLのクエリパラメータを調整するユーティリティ関数
 * 
 * TwitterのメディアURL（pbs.twimg.com/media/）に対して、
 * formatとnameパラメータを適切に設定する関数を提供します。
 */

/**
 * URL調整のフォールバック実装（文字列操作を使用）これいらなくね？
 */
function adjustMediaUrlFallback(
  url: string,
  format?: 'jpg' | 'png' | 'webp',
  name?: 'small' | 'medium' | 'large' | '360x360' | '4096x4096'
): string {
  try {
    // URLをベースURLとクエリパラメータに分割
    const [baseUrl, existingQuery] = url.split('?');
    
    // 既存のクエリパラメータを解析
    const params = new Map<string, string>();
    if (existingQuery) {
      existingQuery.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          params.set(key, decodeURIComponent(value));
        }
      });
    }
    
    // formatとnameパラメータを削除
    params.delete('format');
    params.delete('name');
    
    // 新しいパラメータを設定
    if (format) {
      params.set('format', format);
    }
    if (name) {
      params.set('name', name);
    }
    
    // クエリパラメータを再構築
    const queryString = Array.from(params.entries())
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  } catch (error) {
    console.error('Comiketter: URL調整フォールバックエラー:', error);
    // エラーが発生した場合は元のURLを返す
    return url;
  }
}

/**
 * URLクエリパラメータを調整する
 * @param url 元のURL（パラメータがあってもなくてもOK）
 * @param format 画像形式（jpg, png, webp）
 * @param name 画像サイズ（small, medium, large, 360x360, 4096x4096など）
 * @returns 調整されたURL
 */
export function adjustMediaUrl(
  url: string,
  format?: 'jpg' | 'png' | 'webp',
  name?: 'small' | 'medium' | 'large' | '360x360' | '4096x4096'
): string {
  if (!url || !url.includes('pbs.twimg.com/media/')) {
    // TwitterメディアURLでない場合はそのまま返す
    return url;
  }

  try {
    // URLオブジェクトを使用してクエリパラメータを操作
    // Service Worker環境でも動作するように、グローバルなURLコンストラクタを使用
    // URLは標準APIなので、通常は利用可能
    if (typeof URL === 'undefined') {
      console.warn('Comiketter: URL constructor is not available, using fallback');
      // フォールバック: 文字列操作でクエリパラメータを調整
      return adjustMediaUrlFallback(url, format, name);
    }
    
    const urlObj = new URL(url);
    
    // 既存のformatとnameパラメータを削除
    urlObj.searchParams.delete('format');
    urlObj.searchParams.delete('name');
    
    // 新しいパラメータを設定
    if (format) {
      urlObj.searchParams.set('format', format);
    }
    if (name) {
      urlObj.searchParams.set('name', name);
    }
    
    return urlObj.toString();
  } catch (error) {
    console.error('Comiketter: URL調整エラー:', error);
    // エラーが発生した場合はフォールバックを使用
    return adjustMediaUrlFallback(url, format, name);
  }
}

/**
 * ダウンロード用にURLを調整
 * @param url 元のURL
 * @param format 画像形式（png, jpg, webp）
 * @returns 調整されたURL（formatとname=4096x4096を設定）
 */
export function adjustUrlForDownload(
  url: string,
  format: 'png' | 'jpg' | 'webp' = 'png'
): string {
  return adjustMediaUrl(url, format, '4096x4096');
}

/**
 * ツイート一覧表示用にURLを調整
 * @param url 元のURL
 * @param mediaCount メディアの総数
 * @param index 現在のメディアのインデックス（0から始まる）
 * @returns 調整されたURL
 */
export function adjustUrlForDisplay(
  url: string,
  mediaCount: number,
  index: number = 0
): string {
  // formatは常にjpg
  let name: 'small' | '360x360' = 'small';
  
  if (mediaCount === 1 || mediaCount === 2) {
    // 1、2枚のみ表示の時はnameはsmallに
    name = 'small';
  } else if (mediaCount === 3) {
    // 3枚の時は1枚目のみsmall、残り2枚は360x360に
    if (index === 0) {
      name = 'small';
    } else {
      name = '360x360';
    }
  } else if (mediaCount >= 4) {
    // 4枚の時は全て360x360に
    name = '360x360';
  }
  
  return adjustMediaUrl(url, 'jpg', name);
}

/**
 * ライトボックス（全画面表示）用にURLを調整
 * @param url 元のURL
 * @returns 調整されたURL（format=jpg、name=4096x4096）
 */
export function adjustUrlForLightbox(url: string): string {
  return adjustMediaUrl(url, 'jpg', '4096x4096');
}
