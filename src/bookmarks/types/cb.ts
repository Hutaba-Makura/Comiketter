/**
 * CB（Custom Bookmark）の型定義
 */
export interface Cb {
  id: string;
  name: string;
  description?: string;
  groupId?: string;
  createdAt: Date;
  updatedAt: Date;
  tweetCount: number;
}

/**
 * CBグループの型定義
 */
export interface CbGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  cbCount: number;
}

/**
 * CB作成時の入力型
 */
export interface CreateCbInput {
  name: string;
  description?: string;
  groupId?: string;
}

/**
 * CB更新時の入力型
 */
export interface UpdateCbInput {
  name?: string;
  description?: string;
  groupId?: string;
}
