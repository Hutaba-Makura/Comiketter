import { bookmarkDB } from '../../utils/bookmarkDB';
import { Cb, CreateCbInput, UpdateCbInput } from '../types/cb';

/**
 * CBサービス - bookmarkDBへの薄いラッパー
 */
export class CbService {
  /**
   * CB一覧を取得
   */
  async listCbs(): Promise<Cb[]> {
    try {
      const bookmarks = await bookmarkDB.getAllBookmarks();
      
      // ブックマークをCB形式に変換
      const cbs = bookmarks.map(bookmark => ({
        id: bookmark.id,
        name: bookmark.name,
        description: bookmark.description || '',
        groupId: undefined, // 後でグループ機能を実装
        createdAt: new Date(bookmark.createdAt),
        updatedAt: new Date(bookmark.updatedAt),
        tweetCount: 0 // 後で実際のツイート数を取得
      }));

      // プロト版用のサンプルデータを追加
      if (cbs.length === 0) {
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

      return cbs;
    } catch (error) {
      console.error('CB一覧取得エラー:', error);
      throw new Error('CB一覧の取得に失敗しました');
    }
  }

  /**
   * 指定CBのツイートID一覧を取得
   */
  async getTweetIdsByCbId(cbId: string): Promise<string[]> {
    try {
      const bookmark = await bookmarkDB.getBookmarkById(cbId);
      
      if (!bookmark) {
        // プロト版用のサンプルデータ
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
        
        throw new Error(`CBが見つかりません: ${cbId}`);
      }
      
      // 後で実際のツイートIDを取得する実装を追加
      return [];
    } catch (error) {
      console.error('ツイートID取得エラー:', error);
      throw new Error('ツイートIDの取得に失敗しました');
    }
  }

  /**
   * CBを作成
   */
  async createCb(input: CreateCbInput): Promise<Cb> {
    try {
      const bookmark = await bookmarkDB.addBookmark({
        name: input.name,
        description: input.description || '',
        isActive: true
      });
      
      if (!bookmark) {
        throw new Error('CBの作成に失敗しました');
      }
      
      return {
        id: bookmark.id,
        name: bookmark.name,
        description: bookmark.description || '',
        groupId: undefined,
        createdAt: new Date(bookmark.createdAt),
        updatedAt: new Date(bookmark.updatedAt),
        tweetCount: 0 // 後で実際のツイート数を取得
      };
    } catch (error) {
      console.error('CB作成エラー:', error);
      throw new Error('CBの作成に失敗しました');
    }
  }

  /**
   * CBを更新
   */
  async updateCb(id: string, input: UpdateCbInput): Promise<Cb> {
    try {
      await bookmarkDB.updateBookmark(id, {
        name: input.name,
        description: input.description
      });
      
      const bookmark = await bookmarkDB.getBookmarkById(id);
      if (!bookmark) {
        throw new Error('更新したCBの取得に失敗しました');
      }
      
      return {
        id: bookmark.id,
        name: bookmark.name,
        description: bookmark.description || '',
        groupId: undefined,
        createdAt: new Date(bookmark.createdAt),
        updatedAt: new Date(bookmark.updatedAt),
        tweetCount: 0 // 後で実際のツイート数を取得
      };
    } catch (error) {
      console.error('CB更新エラー:', error);
      throw new Error('CBの更新に失敗しました');
    }
  }

  /**
   * CBを削除
   */
  async deleteCb(id: string): Promise<void> {
    try {
      await bookmarkDB.deleteBookmark(id);
    } catch (error) {
      console.error('CB削除エラー:', error);
      throw new Error('CBの削除に失敗しました');
    }
  }
}

// シングルトンインスタンス
export const cbService = new CbService();
