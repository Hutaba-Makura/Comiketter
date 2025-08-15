/**
 * 並び順の定数
 */
export const SORT_KEYS = {
  CREATED_AT_DESC: 'createdAt_desc',
  CREATED_AT_ASC: 'createdAt_asc',
  UPDATED_AT_DESC: 'updatedAt_desc',
  UPDATED_AT_ASC: 'updatedAt_asc',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  TWEET_COUNT_DESC: 'tweetCount_desc',
  TWEET_COUNT_ASC: 'tweetCount_asc'
} as const;

/**
 * 並び順の表示名
 */
export const SORT_LABELS = {
  [SORT_KEYS.CREATED_AT_DESC]: '作成日時（新しい順）',
  [SORT_KEYS.CREATED_AT_ASC]: '作成日時（古い順）',
  [SORT_KEYS.UPDATED_AT_DESC]: '更新日時（新しい順）',
  [SORT_KEYS.UPDATED_AT_ASC]: '更新日時（古い順）',
  [SORT_KEYS.NAME_ASC]: '名前（昇順）',
  [SORT_KEYS.NAME_DESC]: '名前（降順）',
  [SORT_KEYS.TWEET_COUNT_DESC]: 'ツイート数（多い順）',
  [SORT_KEYS.TWEET_COUNT_ASC]: 'ツイート数（少ない順）'
} as const;

/**
 * ページサイズの定数
 */
export const PAGE_SIZES = {
  SMALL: 20,
  MEDIUM: 50,
  LARGE: 100
} as const;

/**
 * デフォルト設定
 */
export const DEFAULT_SETTINGS = {
  SORT_KEY: SORT_KEYS.UPDATED_AT_DESC,
  PAGE_SIZE: PAGE_SIZES.MEDIUM,
  AUTO_REFRESH_INTERVAL: 30000 // 30秒
} as const;
