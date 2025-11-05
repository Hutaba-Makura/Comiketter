import { cbDataService } from './cbDataService';
import { Cb } from '../types/cb';

/**
 * CBサービス - ビジネスロジック層
 * cbDataServiceをラップして、アプリケーション固有の処理を提供
 */
export class CbService {
  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    await cbDataService.initialize();
  }

  /**
   * CB一覧を取得
   */
  async listCbs(): Promise<Cb[]> {
    try {
      return await cbDataService.getAllCbs();
    } catch (error) {
      console.error('CB一覧取得エラー:', error);
      
      // エラー時はプロト版用のサンプルデータを返す
      return [
        {
          id: 'sample-1',
          name: 'サンプルCB 1',
          description: 'これはプロト版のサンプルデータです',
          groupId: undefined,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          tweetCount: 5
        },
        {
          id: 'sample-2',
          name: 'サンプルCB 2',
          description: '2つ目のサンプルデータ',
          groupId: undefined,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-16'),
          tweetCount: 12
        },
        {
          id: 'sample-3',
          name: '空のCB',
          description: 'ツイートがまだ追加されていないCB',
          groupId: undefined,
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-03'),
          tweetCount: 0
        }
      ];
    }
  }

  /**
   * 指定CBのツイートID一覧を取得
   */
  async getTweetIdsByCbId(cbId: string): Promise<string[]> {
    try {
      return await cbDataService.getTweetIdsByCbId(cbId);
    } catch (error) {
      console.error('ツイートID取得エラー:', error);
      
      // エラー時はプロト版用のサンプルデータを返す
      if (cbId === 'sample-1') {
        return [
          '1234567890123456789',
          '1234567890123456790',
          '1234567890123456791',
          '1234567890123456792',
          '1234567890123456793'
        ];
      } else if (cbId === 'sample-2') {
        return [
          '1234567890123456794',
          '1234567890123456795',
          '1234567890123456796',
          '1234567890123456797',
          '1234567890123456798',
          '1234567890123456799',
          '1234567890123456800',
          '1234567890123456801',
          '1234567890123456802',
          '1234567890123456803',
          '1234567890123456804',
          '1234567890123456805'
        ];
      } else if (cbId === 'sample-3') {
        return [];
      }
      
      return [];
    }
  }

  /**
   * 新しいCBを作成
   */
  async createCb(name: string, description?: string): Promise<Cb> {
    try {
      return await cbDataService.createCb(name, description);
    } catch (error) {
      console.error('CB作成エラー:', error);
      throw new Error('CBの作成に失敗しました');
    }
  }

  /**
   * CBを更新
   */
  async updateCb(cbId: string, updates: { name?: string; description?: string }): Promise<Cb> {
    try {
      return await cbDataService.updateCb(cbId, updates);
    } catch (error) {
      console.error('CB更新エラー:', error);
      throw new Error('CBの更新に失敗しました');
    }
  }

  /**
   * CBを削除
   */
  async deleteCb(cbId: string): Promise<void> {
    try {
      await cbDataService.deleteCb(cbId);
    } catch (error) {
      console.error('CB削除エラー:', error);
      throw new Error('CBの削除に失敗しました');
    }
  }

  /**
   * CBをコピー
   * 元のCBとそのツイートを全てコピーして新しいCBを作成
   */
  async copyCb(cbId: string): Promise<Cb> {
    try {
      return await cbDataService.copyCb(cbId);
    } catch (error) {
      console.error('CBコピーエラー:', error);
      throw new Error('CBのコピーに失敗しました');
    }
  }

  /**
   * ツイートをCBに追加
   */
  async addTweetToCb(cbId: string, tweetId: string, tweetData: {
    authorUsername: string;
    authorDisplayName?: string;
    authorId?: string;
    content: string;
    mediaUrls?: string[];
    mediaTypes?: string[];
    tweetDate: string;
    isRetweet: boolean;
    isReply: boolean;
    replyToTweetId?: string;
    replyToUsername?: string;
  }): Promise<void> {
    try {
      await cbDataService.addTweetToCb(cbId, tweetId, tweetData);
    } catch (error) {
      console.error('ツイート追加エラー:', error);
      throw new Error('ツイートの追加に失敗しました');
    }
  }

  /**
   * ツイートをCBから削除
   */
  async removeTweetFromCb(cbId: string, tweetId: string): Promise<void> {
    try {
      await cbDataService.removeTweetFromCb(cbId, tweetId);
    } catch (error) {
      console.error('ツイート削除エラー:', error);
      throw new Error('ツイートの削除に失敗しました');
    }
  }

  /**
   * 統計情報を取得
   */
  async getStats(): Promise<{
    totalCbs: number;
    totalTweets: number;
    activeCbs: number;
    tweetsByCb: { [cbId: string]: number };
  }> {
    try {
      return await cbDataService.getStats();
    } catch (error) {
      console.error('統計情報取得エラー:', error);
      return {
        totalCbs: 0,
        totalTweets: 0,
        activeCbs: 0,
        tweetsByCb: {}
      };
    }
  }
}

// シングルトンインスタンス
export const cbService = new CbService();
