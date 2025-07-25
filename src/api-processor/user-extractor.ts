/**
 * ユーザー情報を抽出するクラス
 * 
 * Twitter APIレスポンスからユーザーの基本情報を抽出し、
 * 統一された形式に変換する
 */

import type { ProcessedUser } from './types';

export class UserExtractor {
  /**
   * ツイートオブジェクトからユーザー情報を抽出
   */
  extractFromTweet(tweetData: any): ProcessedUser | null {
    try {
      const userResult = tweetData.core?.user_results?.result;
      if (!userResult) {
        return null;
      }

      const legacy = userResult.legacy;
      const avatar = userResult.avatar;

      if (!legacy?.screen_name) {
        return null;
      }

      const user: ProcessedUser = {
        name: legacy.name || '',
        screen_name: legacy.screen_name,
        avatar_url: avatar?.image_url || ''
      };

      return user;
    } catch (error) {
      console.error('Comiketter: ユーザー情報抽出エラー:', error);
      return null;
    }
  }

  /**
   * ユーザーオブジェクトからProcessedUserを抽出
   */
  extractFromUser(userData: any): ProcessedUser | null {
    try {
      if (!userData?.legacy?.screen_name) {
        return null;
      }

      const legacy = userData.legacy;
      const avatar = userData.avatar;

      const user: ProcessedUser = {
        name: legacy.name || '',
        screen_name: legacy.screen_name,
        avatar_url: avatar?.image_url || ''
      };

      return user;
    } catch (error) {
      console.error('Comiketter: ユーザー情報抽出エラー:', error);
      return null;
    }
  }

  /**
   * 複数のユーザーを一括抽出
   */
  extractMultipleFromUsers(usersData: any[]): ProcessedUser[] {
    const users: ProcessedUser[] = [];

    for (const userData of usersData) {
      const user = this.extractFromUser(userData);
      if (user) {
        users.push(user);
      }
    }

    return users;
  }
} 