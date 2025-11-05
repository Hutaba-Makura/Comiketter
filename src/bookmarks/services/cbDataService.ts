import { bookmarkDB, BookmarkDB } from '../../utils/bookmarkDB';
import { Cb } from '../types/cb';

/**
 * CBページ専用データアクセス層
 * IndexedDBとの直接的なやり取りを担当
 */
export class CbDataService {
  private db: typeof bookmarkDB;

  constructor() {
    this.db = bookmarkDB;
  }

  /**
   * データベースの初期化
   */
  async initialize(): Promise<void> {
    try {
      await this.db.init();
      console.log('CBデータサービス: データベース初期化完了');
    } catch (error) {
      console.error('CBデータサービス: データベース初期化エラー:', error);
      throw new Error('データベースの初期化に失敗しました');
    }
  }

  /**
   * CB一覧を取得
   */
  async getAllCbs(): Promise<Cb[]> {
    try {
      const bookmarks = await this.db.getAllBookmarks();
      
      // ブックマークをCB形式に変換
      const cbs = await Promise.all(
        bookmarks.map(async (bookmark) => {
          const tweetCount = await this.getTweetCountByCbId(bookmark.id);
          
          return {
            id: bookmark.id,
            name: bookmark.name,
            description: bookmark.description || '',
            groupId: undefined, // 後でグループ機能を実装
            createdAt: new Date(bookmark.createdAt),
            updatedAt: new Date(bookmark.updatedAt),
            tweetCount
          };
        })
      );

      // 作成日時で降順ソート
      return cbs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
      const tweets = await this.db.getBookmarkedTweetsByBookmarkId(cbId);
      
      // ツイートIDのみを抽出し、保存日時で降順ソート
      return tweets
        .map(tweet => tweet.tweetId)
        .sort((a, b) => {
          const tweetA = tweets.find(t => t.tweetId === a);
          const tweetB = tweets.find(t => t.tweetId === b);
          if (!tweetA || !tweetB) return 0;
          return new Date(tweetB.savedAt).getTime() - new Date(tweetA.savedAt).getTime();
        });
    } catch (error) {
      console.error('ツイートID取得エラー:', error);
      throw new Error('ツイートIDの取得に失敗しました');
    }
  }

  /**
   * 指定CBのツイート数を取得
   */
  async getTweetCountByCbId(cbId: string): Promise<number> {
    try {
      const tweets = await this.db.getBookmarkedTweetsByBookmarkId(cbId);
      return tweets.length;
    } catch (error) {
      console.error('ツイート数取得エラー:', error);
      return 0;
    }
  }

  /**
   * 重複しないCB名を生成
   * 既存のCB名をチェックして、「元の名前(2)」「元の名前(3)」のように番号を付ける
   */
  private async generateUniqueCbName(baseName: string): Promise<string> {
    const allCbs = await this.getAllCbs();
    const existingNames = new Set(allCbs.map(cb => cb.name));
    
    // ベース名が既に存在しない場合はそのまま返す
    if (!existingNames.has(baseName)) {
      return baseName;
    }
    
    // パターンにマッチする名前を探す (例: "名前(2)", "名前(3)")
    const pattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\((\\d+)\\)$`);
    const matchedNumbers: number[] = [];
    
    existingNames.forEach(name => {
      const match = name.match(pattern);
      if (match) {
        matchedNumbers.push(parseInt(match[1], 10));
      }
    });
    
    // 最小の利用可能な番号を見つける
    let number = 2;
    while (matchedNumbers.includes(number)) {
      number++;
    }
    
    return `${baseName}(${number})`;
  }

  /**
   * 新しいCBを作成
   */
  async createCb(name: string, description?: string): Promise<Cb> {
    // TODO: 型エラーを修正後に実装
    throw new Error('CB作成機能は一時的に無効化されています');
    
    /*
    try {
      const result = await this.db.addBookmark({
        name,
        description: description || '',
        color: this.generateRandomColor(),
        isActive: true
      });

      // 型ガードで結果を確認
      if (!result || typeof result !== 'object' || !('id' in result)) {
        throw new Error('CBの作成に失敗しました');
      }

      const bookmark = result as BookmarkDB;

      return {
        id: bookmark.id,
        name: bookmark.name,
        description: bookmark.description || '',
        groupId: undefined,
        createdAt: new Date(bookmark.createdAt),
        updatedAt: new Date(bookmark.updatedAt),
        tweetCount: 0
      };
    } catch (error) {
      console.error('CB作成エラー:', error);
      throw new Error('CBの作成に失敗しました');
    }
    */
  }

  /**
   * CBをコピー
   * 元のCBとそのツイートを全てコピーして新しいCBを作成
   */
  async copyCb(cbId: string): Promise<Cb> {
    try {
      // 元のCBを取得
      const originalBookmark = await this.db.getBookmarkById(cbId);
      if (!originalBookmark) {
        throw new Error('コピー元のCBが見つかりません');
      }

      // 重複しない名前を生成
      const newName = await this.generateUniqueCbName(originalBookmark.name);

      // 新しいCBを作成
      const newBookmark = await this.db.addBookmark({
        name: newName,
        description: originalBookmark.description || '',
        color: originalBookmark.color,
        isActive: true
      });

      // 元のCBのツイートを全て取得（新しい順で取得されている）
      const originalTweets = await this.db.getBookmarkedTweetsByBookmarkId(cbId);

      // 古い順（昇順）にソートして、新しいツイートが最後に登録されるようにする
      const sortedTweets = [...originalTweets].sort((a, b) => 
        new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
      );

      // ツイートを新しいCBにコピー
      for (const tweet of sortedTweets) {
        await this.db.addBookmarkedTweet({
          bookmarkId: newBookmark.id,
          tweetId: tweet.tweetId,
          authorUsername: tweet.authorUsername,
          authorDisplayName: tweet.authorDisplayName,
          authorId: tweet.authorId,
          authorProfileImageUrl: tweet.authorProfileImageUrl,
          content: tweet.content,
          mediaUrls: tweet.mediaUrls,
          mediaTypes: tweet.mediaTypes,
          tweetDate: tweet.tweetDate,
          isRetweet: tweet.isRetweet,
          isReply: tweet.isReply,
          replyToTweetId: tweet.replyToTweetId,
          replyToUsername: tweet.replyToUsername,
          saveType: tweet.saveType,
          favoriteCount: tweet.favoriteCount,
          retweetCount: tweet.retweetCount,
          replyCount: tweet.replyCount
        });
      }

      // 新しいCBの情報を取得
      const tweetCount = await this.getTweetCountByCbId(newBookmark.id);

      return {
        id: newBookmark.id,
        name: newBookmark.name,
        description: newBookmark.description || '',
        groupId: undefined,
        createdAt: new Date(newBookmark.createdAt),
        updatedAt: new Date(newBookmark.updatedAt),
        tweetCount
      };
    } catch (error) {
      console.error('CBコピーエラー:', error);
      throw new Error('CBのコピーに失敗しました');
    }
  }

  /**
   * CBを更新
   */
  async updateCb(cbId: string, updates: { name?: string; description?: string }): Promise<Cb> {
    try {
      const bookmark = await this.db.getBookmarkById(cbId);
      if (!bookmark) {
        throw new Error('CBが見つかりません');
      }

      await this.db.updateBookmark(cbId, {
        name: updates.name ?? bookmark.name,
        description: updates.description ?? bookmark.description
      });

      const updatedBookmark = await this.db.getBookmarkById(cbId);
      if (!updatedBookmark) {
        throw new Error('更新後のCBが見つかりません');
      }

      const tweetCount = await this.getTweetCountByCbId(cbId);

      return {
        id: updatedBookmark.id,
        name: updatedBookmark.name,
        description: updatedBookmark.description || '',
        groupId: undefined,
        createdAt: new Date(updatedBookmark.createdAt),
        updatedAt: new Date(updatedBookmark.updatedAt),
        tweetCount
      };
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
      // 関連するツイートも削除
      await this.db.deleteBookmark(cbId);
      console.log(`CB削除完了: ${cbId}`);
    } catch (error) {
      console.error('CB削除エラー:', error);
      throw new Error('CBの削除に失敗しました');
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
      // 既に存在するかチェック
      const existingTweets = await this.db.getBookmarkedTweetsByBookmarkId(cbId);
      const alreadyExists = existingTweets.some(tweet => tweet.tweetId === tweetId);
      
      if (alreadyExists) {
        console.log(`ツイートは既にCBに存在します: ${tweetId}`);
        return;
      }

      await this.db.addBookmarkedTweet({
        bookmarkId: cbId,
        tweetId,
        authorUsername: tweetData.authorUsername,
        authorDisplayName: tweetData.authorDisplayName,
        authorId: tweetData.authorId,
        content: tweetData.content,
        mediaUrls: tweetData.mediaUrls,
        mediaTypes: tweetData.mediaTypes,
        tweetDate: tweetData.tweetDate,
        isRetweet: tweetData.isRetweet,
        isReply: tweetData.isReply,
        replyToTweetId: tweetData.replyToTweetId,
        replyToUsername: tweetData.replyToUsername,
        saveType: 'url'
      });

      console.log(`ツイートをCBに追加完了: ${tweetId} -> ${cbId}`);
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
      const tweetIdToDelete = `${cbId}_${tweetId}`;
      await this.db.deleteBookmarkedTweet(tweetIdToDelete);
      console.log(`ツイートをCBから削除完了: ${tweetId} <- ${cbId}`);
    } catch (error) {
      console.error('ツイート削除エラー:', error);
      throw new Error('ツイートの削除に失敗しました');
    }
  }

  /**
   * ランダムな色を生成（CB用）
   */
  private generateRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * データベースの統計情報を取得
   */
  async getStats(): Promise<{
    totalCbs: number;
    totalTweets: number;
    activeCbs: number;
    tweetsByCb: { [cbId: string]: number };
  }> {
    try {
      const cbs = await this.getAllCbs();
      const tweetsByCb: { [cbId: string]: number } = {};
      
      let totalTweets = 0;
      for (const cb of cbs) {
        tweetsByCb[cb.id] = cb.tweetCount;
        totalTweets += cb.tweetCount;
      }

      return {
        totalCbs: cbs.length,
        totalTweets,
        activeCbs: cbs.length, // 現在は全てアクティブ
        tweetsByCb
      };
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
export const cbDataService = new CbDataService();
