import { FilenameGenerator } from '../utils/filenameGenerator'
import { PatternToken, AggregationToken, FilenameSettingProps, TweetMediaFileProps } from '../types'

describe('FilenameGenerator', () => {
  const sampleMediaFile: TweetMediaFileProps = {
    tweetId: '1145141919810',
    tweetUser: {
      screenName: 'testUser',
      userId: '123456789',
      displayName: 'Test User',
      isProtected: false,
    },
    createdAt: new Date('2024-12-01T14:30:00Z'),
    serial: 1,
    hash: 'abc123def456',
    source: 'https://example.com/image.jpg',
    type: 'image',
    ext: 'jpg',
  }

  describe('validateDirectory', () => {
    it('正常なディレクトリ名を検証する', () => {
      expect(FilenameGenerator.validateDirectory('comiketter')).toBeUndefined()
      expect(FilenameGenerator.validateDirectory('my-folder')).toBeUndefined()
      expect(FilenameGenerator.validateDirectory('folder_with_underscore')).toBeUndefined()
    })

    it('無効なディレクトリ名を検証する', () => {
      expect(FilenameGenerator.validateDirectory('folder<with>invalid:chars')).toBeDefined()
      expect(FilenameGenerator.validateDirectory('folder/with\\invalid|chars')).toBeDefined()
      expect(FilenameGenerator.validateDirectory('folder*with?invalid"chars')).toBeDefined()
    })

    it('空のディレクトリ名を検証する', () => {
      expect(FilenameGenerator.validateDirectory('')).toBeUndefined()
    })
  })

  describe('validateFilenamePattern', () => {
    it('有効なパターンを検証する', () => {
      const validPatterns = [
        [PatternToken.Hash, PatternToken.Serial],
        [PatternToken.TweetId, PatternToken.Serial],
        [PatternToken.Account, PatternToken.Hash, PatternToken.Serial],
      ]

      validPatterns.forEach(pattern => {
        expect(FilenameGenerator.validateFilenamePattern(pattern)).toBeUndefined()
      })
    })

    it('無効なパターンを検証する', () => {
      const invalidPatterns = [
        [PatternToken.Account],
        [PatternToken.TweetId],
        [PatternToken.Serial],
        [],
      ]

      invalidPatterns.forEach(pattern => {
        expect(FilenameGenerator.validateFilenamePattern(pattern)).toBeDefined()
      })
    })
  })

  describe('validateFilenameSettings', () => {
    it('有効な設定を検証する', () => {
      const validSettings: FilenameSettingProps = {
        directory: 'comiketter',
        noSubDirectory: false,
        filenamePattern: [PatternToken.Account, PatternToken.Hash, PatternToken.Serial],
        fileAggregation: true,
        groupBy: AggregationToken.Account,
      }

      expect(FilenameGenerator.validateFilenameSettings(validSettings)).toBeUndefined()
    })

    it('無効な設定を検証する', () => {
      const invalidSettings: FilenameSettingProps = {
        directory: 'invalid<directory>',
        noSubDirectory: false,
        filenamePattern: [PatternToken.Account],
        fileAggregation: true,
        groupBy: AggregationToken.Account,
      }

      expect(FilenameGenerator.validateFilenameSettings(invalidSettings)).toBeDefined()
    })
  })

  describe('makeFilename', () => {
    it('基本的なファイル名を生成する', () => {
      const settings: FilenameSettingProps = {
        directory: 'comiketter',
        noSubDirectory: false,
        filenamePattern: [PatternToken.Account, PatternToken.TweetId, PatternToken.Serial],
        fileAggregation: true,
        groupBy: AggregationToken.Account,
      };

      const filename = FilenameGenerator.makeFilename(sampleMediaFile, settings);
      expect(filename).toBe('comiketter/testUser/testUser-1145141919810-01.jpg');
    });

    it('サブディレクトリを無効化したファイル名を生成する', () => {
      const settings: FilenameSettingProps = {
        directory: 'comiketter',
        noSubDirectory: true,
        filenamePattern: [PatternToken.Account, PatternToken.Hash],
        fileAggregation: false,
        groupBy: AggregationToken.Account,
      };

      const filename = FilenameGenerator.makeFilename(sampleMediaFile, settings);
      expect(filename).toBe('testUser-abc123def456.jpg');
    });

    it('日付トークンを含むファイル名を生成する', () => {
      const settings: FilenameSettingProps = {
        directory: 'comiketter',
        noSubDirectory: false,
        filenamePattern: [PatternToken.Account, PatternToken.Date, PatternToken.Serial],
        fileAggregation: true,
        groupBy: AggregationToken.Account,
      };

      const filename = FilenameGenerator.makeFilename(sampleMediaFile, settings);
      // 現在の日付が含まれることを確認
      expect(filename).toMatch(/comiketter\/testUser\/testUser-\d{8}-01\.jpg/);
    });

    it('空のパターンでエラーを投げる', () => {
      const settings: FilenameSettingProps = {
        directory: 'comiketter',
        noSubDirectory: false,
        filenamePattern: [],
        fileAggregation: false,
        groupBy: AggregationToken.Account,
      };

      expect(() => {
        FilenameGenerator.makeFilename(sampleMediaFile, settings);
      }).toThrow("Filename pattern can't be empty.");
    });
  });

  describe('getDefaultFilenameSettings', () => {
    it('デフォルト設定を取得する', () => {
      const defaultSettings = FilenameGenerator.getDefaultFilenameSettings()
      
      expect(defaultSettings).toEqual({
        directory: 'comiketter',
        noSubDirectory: false,
        filenamePattern: [PatternToken.Account, PatternToken.TweetId, PatternToken.Serial],
        fileAggregation: true,
        groupBy: AggregationToken.Account,
      })
    })
  })

  describe('generatePreview', () => {
    it('プレビューを生成する', () => {
      const settings: FilenameSettingProps = {
        directory: 'comiketter',
        noSubDirectory: false,
        filenamePattern: [PatternToken.Account, PatternToken.TweetId, PatternToken.Serial],
        fileAggregation: true,
        groupBy: AggregationToken.Account,
      };

      const preview = FilenameGenerator.generatePreview(settings);
      expect(preview).toBe('tweetUser-1145141919810-02.jpg');
    });

    it('複雑なパターンでプレビューを生成する', () => {
      const settings: FilenameSettingProps = {
        directory: 'comiketter',
        noSubDirectory: false,
        filenamePattern: [
          PatternToken.Account,
          PatternToken.TweetDate,
          PatternToken.Hash,
          PatternToken.Serial,
        ],
        fileAggregation: false,
        groupBy: AggregationToken.Account,
      };

      const preview = FilenameGenerator.generatePreview(settings);
      expect(preview).toBe('tweetUser-20240202-2vfn8shkjvd98892pR-02.jpg');
    });
  })

  describe('getPatternTokenDescriptions', () => {
    it('パターントークンの説明一覧を取得する', () => {
      const descriptions = FilenameGenerator.getPatternTokenDescriptions();
      
      expect(descriptions).toHaveLength(13);
      expect(descriptions[0]).toEqual({
        token: PatternToken.Account,
        description: 'アカウント名（screenName）',
        example: 'elonMask',
      });
      
      // すべてのトークンが含まれていることを確認
      const tokens = descriptions.map(d => d.token);
      expect(tokens).toContain(PatternToken.Account);
      expect(tokens).toContain(PatternToken.TweetId);
      expect(tokens).toContain(PatternToken.Serial);
      expect(tokens).toContain(PatternToken.Hash);
    });
  })

  describe('エッジケース', () => {
    it('特殊文字を含むアカウント名を処理する', () => {
      const mediaFileWithSpecialChars: TweetMediaFileProps = {
        ...sampleMediaFile,
        tweetUser: {
          ...sampleMediaFile.tweetUser,
          screenName: 'user@with#special$chars',
        },
      };

      const settings: FilenameSettingProps = {
        directory: 'comiketter',
        noSubDirectory: false,
        filenamePattern: [PatternToken.Account, PatternToken.Serial],
        fileAggregation: false,
        groupBy: AggregationToken.Account,
      };

      const filename = FilenameGenerator.makeFilename(mediaFileWithSpecialChars, settings);
      expect(filename).toBe('comiketter/user@with#special$chars-01.jpg');
    });

    it('長いディレクトリ名を処理する', () => {
      const longDirectory = 'a'.repeat(4097); // 4096文字を超える
      const settings: FilenameSettingProps = {
        directory: longDirectory,
        noSubDirectory: false,
        filenamePattern: [PatternToken.Account, PatternToken.Serial],
        fileAggregation: false,
        groupBy: AggregationToken.Account,
      };

      expect(FilenameGenerator.validateDirectory(longDirectory)).toBeDefined();
    });
  })
}) 