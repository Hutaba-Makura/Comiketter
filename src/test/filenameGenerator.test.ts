import { FilenameGenerator } from '../utils/filenameGenerator'
import { PatternToken, AggregationToken, FilenameSettingProps, TweetMediaFileProps } from '../types'

describe('FilenameGenerator', () => {
  const mockMediaFile: TweetMediaFileProps = {
    tweetId: '1145141919810',
    tweetUser: {
      screenName: 'testUser',
      userId: '123456789',
      displayName: 'Test User',
      isProtected: false,
    },
    createdAt: new Date('2024-01-15T10:30:00Z'),
    serial: 1,
    hash: 'abc123def456',
    source: 'https://example.com/image.jpg',
    type: 'image',
    ext: '.jpg',
  }

  describe('validateDirectory', () => {
    it('should return undefined for valid directory names', () => {
      expect(FilenameGenerator.validateDirectory('comiketter')).toBeUndefined()
      expect(FilenameGenerator.validateDirectory('my_folder')).toBeUndefined()
      expect(FilenameGenerator.validateDirectory('folder123')).toBeUndefined()
    })

    it('should return error for invalid directory names', () => {
      expect(FilenameGenerator.validateDirectory('')).toBeDefined()
      expect(FilenameGenerator.validateDirectory('folder<name')).toBeDefined()
      expect(FilenameGenerator.validateDirectory('folder:name')).toBeDefined()
      expect(FilenameGenerator.validateDirectory('folder*name')).toBeDefined()
    })

    it('should return error for too long directory names', () => {
      const longName = 'a'.repeat(4097)
      expect(FilenameGenerator.validateDirectory(longName)).toBeDefined()
    })
  })

  describe('validateFilenamePattern', () => {
    it('should return undefined for valid patterns with hash', () => {
      const pattern = [PatternToken.Account, PatternToken.Hash]
      expect(FilenameGenerator.validateFilenamePattern(pattern)).toBeUndefined()
    })

    it('should return undefined for valid patterns with tweetId and serial', () => {
      const pattern = [PatternToken.TweetId, PatternToken.Serial]
      expect(FilenameGenerator.validateFilenamePattern(pattern)).toBeUndefined()
    })

    it('should return error for invalid patterns', () => {
      const pattern = [PatternToken.Account, PatternToken.Date]
      expect(FilenameGenerator.validateFilenamePattern(pattern)).toBeDefined()
    })
  })

  describe('validateFilenameSettings', () => {
    it('should return undefined for valid settings', () => {
      const settings: FilenameSettingProps = {
        directory: 'comiketter',
        noSubDirectory: false,
        filenamePattern: [PatternToken.Account, PatternToken.Hash],
        fileAggregation: true,
        groupBy: AggregationToken.Account,
      }
      expect(FilenameGenerator.validateFilenameSettings(settings)).toBeUndefined()
    })

    it('should return error for invalid settings', () => {
      const settings: FilenameSettingProps = {
        directory: 'invalid<name',
        noSubDirectory: false,
        filenamePattern: [PatternToken.Account, PatternToken.Date],
        fileAggregation: true,
        groupBy: AggregationToken.Account,
      }
      expect(FilenameGenerator.validateFilenameSettings(settings)).toBeDefined()
    })
  })

  describe('makeFilename', () => {
    it('should generate filename with basic pattern', () => {
      const settings: FilenameSettingProps = {
        directory: 'comiketter',
        noSubDirectory: false,
        filenamePattern: [PatternToken.Account, PatternToken.TweetId, PatternToken.Serial],
        fileAggregation: true,
        groupBy: AggregationToken.Account,
      }

      const filename = FilenameGenerator.makeFilename(mockMediaFile, settings)
      expect(filename).toBe('comiketter/testUser/testUser-1145141919810-01.jpg')
    })

    it('should generate filename with date pattern', () => {
      const settings: FilenameSettingProps = {
        directory: 'downloads',
        noSubDirectory: false,
        filenamePattern: [PatternToken.TweetDate, PatternToken.Account, PatternToken.Hash],
        fileAggregation: false,
        groupBy: AggregationToken.Account,
      }

      const filename = FilenameGenerator.makeFilename(mockMediaFile, settings)
      expect(filename).toBe('downloads/20240115-testUser-abc123def456.jpg')
    })

    it('should generate filename without directory when noDir option is true', () => {
      const settings: FilenameSettingProps = {
        directory: 'comiketter',
        noSubDirectory: false,
        filenamePattern: [PatternToken.Account, PatternToken.TweetId],
        fileAggregation: true,
        groupBy: AggregationToken.Account,
      }

      const filename = FilenameGenerator.makeFilename(mockMediaFile, settings, { noDir: true })
      expect(filename).toBe('testUser-1145141919810.jpg')
    })

    it('should throw error for empty pattern', () => {
      const settings: FilenameSettingProps = {
        directory: 'comiketter',
        noSubDirectory: false,
        filenamePattern: [],
        fileAggregation: false,
        groupBy: AggregationToken.Account,
      }

      expect(() => {
        FilenameGenerator.makeFilename(mockMediaFile, settings)
      }).toThrow("Filename pattern can't be empty.")
    })
  })

  describe('getDefaultFilenameSettings', () => {
    it('should return default settings', () => {
      const settings = FilenameGenerator.getDefaultFilenameSettings()
      expect(settings.directory).toBe('comiketter')
      expect(settings.noSubDirectory).toBe(false)
      expect(settings.filenamePattern).toEqual([
        PatternToken.Account,
        PatternToken.TweetId,
        PatternToken.Serial,
      ])
      expect(settings.fileAggregation).toBe(true)
      expect(settings.groupBy).toBe(AggregationToken.Account)
    })
  })

  describe('generatePreview', () => {
    it('should generate preview filename', () => {
      const settings: FilenameSettingProps = {
        directory: 'preview',
        noSubDirectory: false,
        filenamePattern: [PatternToken.Account, PatternToken.TweetDate, PatternToken.Serial],
        fileAggregation: false,
        groupBy: AggregationToken.Account,
      }

      const preview = FilenameGenerator.generatePreview(settings)
      expect(preview).toBe('tweetUser-22220202-02.jpg')
    })
  })
}) 