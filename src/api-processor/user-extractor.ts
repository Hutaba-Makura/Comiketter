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

      // 実際のAPIレスポンス構造に合わせて修正
      // core.user_results.result.core からユーザー情報を取得
      const userCore = userResult.core;
      const avatar = userResult.avatar;

      if (!userCore?.screen_name) {
        return null;
      }

      const user: ProcessedUser = {
        name: userCore.name || '',
        screen_name: userCore.screen_name,
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
      // 実際のAPIレスポンス構造に合わせて修正
      const userCore = userData.core;
      const avatar = userData.avatar;

      if (!userCore?.screen_name) {
        return null;
      }

      const user: ProcessedUser = {
        name: userCore.name || '',
        screen_name: userCore.screen_name,
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