import { cbDataService } from '../services/cbDataService';
import { Cb } from '../types/cb';

// bookmarkDBのモック
jest.mock('../../utils/bookmarkDB', () => ({
  bookmarkDB: {
    init: jest.fn(),
    getAllBookmarks: jest.fn(),
    getBookmarkedTweetsByBookmarkId: jest.fn(),
    addBookmark: jest.fn(),
    updateBookmark: jest.fn(),
    deleteBookmark: jest.fn(),
    addBookmarkedTweet: jest.fn(),
    deleteBookmarkedTweet: jest.fn(),
  },
}));

import { bookmarkDB } from '../../utils/bookmarkDB';

describe('CbDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('データベースの初期化が成功する', async () => {
      (bookmarkDB.init as jest.Mock).mockResolvedValue(undefined);

      await expect(cbDataService.initialize()).resolves.toBeUndefined();
      expect(bookmarkDB.init).toHaveBeenCalled();
    });

    it('データベースの初期化が失敗した場合、エラーを投げる', async () => {
      (bookmarkDB.init as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(cbDataService.initialize()).rejects.toThrow('データベースの初期化に失敗しました');
      expect(bookmarkDB.init).toHaveBeenCalled();
    });
  });

  describe('getAllCbs', () => {
    it('CB一覧を取得できる', async () => {
      const mockBookmarks = [
        {
          id: 'test-1',
          name: 'テストCB 1',
          description: 'テスト用CB',
          color: '#FF6B6B',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isActive: true,
        },
      ];

      const mockTweets = [
        { tweetId: '1234567890123456789', savedAt: '2024-01-01T00:00:00.000Z' },
        { tweetId: '1234567890123456790', savedAt: '2024-01-02T00:00:00.000Z' },
      ];

      (bookmarkDB.getAllBookmarks as jest.Mock).mockResolvedValue(mockBookmarks);
      (bookmarkDB.getBookmarkedTweetsByBookmarkId as jest.Mock).mockResolvedValue(mockTweets);

      const result = await cbDataService.getAllCbs();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'test-1',
        name: 'テストCB 1',
        description: 'テスト用CB',
        groupId: undefined,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        tweetCount: 2,
      });

      expect(bookmarkDB.getAllBookmarks).toHaveBeenCalled();
      expect(bookmarkDB.getBookmarkedTweetsByBookmarkId).toHaveBeenCalledWith('test-1');
    });
  });

  describe('getTweetIdsByCbId', () => {
    it('指定CBのツイートID一覧を取得できる', async () => {
      const mockTweets = [
        { tweetId: '1234567890123456789', savedAt: '2024-01-01T00:00:00.000Z' },
        { tweetId: '1234567890123456790', savedAt: '2024-01-02T00:00:00.000Z' },
        { tweetId: '1234567890123456791', savedAt: '2024-01-03T00:00:00.000Z' },
      ];

      (bookmarkDB.getBookmarkedTweetsByBookmarkId as jest.Mock).mockResolvedValue(mockTweets);

      const result = await cbDataService.getTweetIdsByCbId('test-1');

      expect(result).toEqual([
        '1234567890123456791',
        '1234567890123456790',
        '1234567890123456789',
      ]);

      expect(bookmarkDB.getBookmarkedTweetsByBookmarkId).toHaveBeenCalledWith('test-1');
    });
  });

  describe('createCb', () => {
    it('新しいCBを作成できる', async () => {
      const mockBookmark = {
        id: 'new-cb-id',
        name: '新しいCB',
        description: '新しいCBの説明',
        color: '#FF6B6B',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        isActive: true,
      };

      (bookmarkDB.addBookmark as jest.Mock).mockResolvedValue(mockBookmark);

      const result = await cbDataService.createCb('新しいCB', '新しいCBの説明');

      expect(result).toEqual({
        id: 'new-cb-id',
        name: '新しいCB',
        description: '新しいCBの説明',
        groupId: undefined,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        tweetCount: 0,
      });

      expect(bookmarkDB.addBookmark).toHaveBeenCalledWith({
        name: '新しいCB',
        description: '新しいCBの説明',
        color: expect.any(String),
        isActive: true,
      });
    });
  });

  describe('addTweetToCb', () => {
    it('ツイートをCBに追加できる', async () => {
      const mockExistingTweets: any[] = [];
      
      (bookmarkDB.getBookmarkedTweetsByBookmarkId as jest.Mock).mockResolvedValue(mockExistingTweets);
      (bookmarkDB.addBookmarkedTweet as jest.Mock).mockResolvedValue(undefined);

      const tweetData = {
        authorUsername: 'testuser',
        authorDisplayName: 'テストユーザー',
        authorId: '123456789',
        content: 'テストツイート',
        mediaUrls: [],
        mediaTypes: [],
        tweetDate: '2024-01-01T00:00:00.000Z',
        isRetweet: false,
        isReply: false,
      };

      await cbDataService.addTweetToCb('test-cb', '1234567890123456789', tweetData);

      expect(bookmarkDB.getBookmarkedTweetsByBookmarkId).toHaveBeenCalledWith('test-cb');
      expect(bookmarkDB.addBookmarkedTweet).toHaveBeenCalledWith({
        bookmarkId: 'test-cb',
        tweetId: '1234567890123456789',
        authorUsername: 'testuser',
        authorDisplayName: 'テストユーザー',
        authorId: '123456789',
        content: 'テストツイート',
        mediaUrls: [],
        mediaTypes: [],
        tweetDate: '2024-01-01T00:00:00.000Z',
        isRetweet: false,
        isReply: false,
        replyToTweetId: undefined,
        replyToUsername: undefined,
        saveType: 'url',
      });
    });

    it('既に存在するツイートは追加しない', async () => {
      const mockExistingTweets: any[] = [
        { tweetId: '1234567890123456789', savedAt: '2024-01-01T00:00:00.000Z' },
      ];

      (bookmarkDB.getBookmarkedTweetsByBookmarkId as jest.Mock).mockResolvedValue(mockExistingTweets);

      const tweetData = {
        authorUsername: 'testuser',
        content: 'テストツイート',
        tweetDate: '2024-01-01T00:00:00.000Z',
        isRetweet: false,
        isReply: false,
      };

      await cbDataService.addTweetToCb('test-cb', '1234567890123456789', tweetData);

      expect(bookmarkDB.getBookmarkedTweetsByBookmarkId).toHaveBeenCalledWith('test-cb');
      expect(bookmarkDB.addBookmarkedTweet).not.toHaveBeenCalled();
    });
  });
});
