/**
 * 数値を短縮形式でフォーマット（例: 12345 → 12.3K）
 */
export function formatCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  } else if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}K`;
  } else {
    return `${(count / 1000000).toFixed(1)}M`;
  }
}

/**
 * 日付を相対時間でフォーマット
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return '今';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}分前`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}時間前`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}日前`;
  } else {
    return date.toLocaleDateString('ja-JP');
  }
}

/**
 * 日付を絶対時間でフォーマット
 */
export function formatAbsoluteTime(date: Date): string {
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * ツイートIDを短縮形式でフォーマット
 */
export function formatTweetId(id: string): string {
  if (id.length <= 8) {
    return id;
  }
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}
