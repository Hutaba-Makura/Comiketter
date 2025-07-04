import { PatternToken, AggregationToken, FilenameSettingProps, TweetMediaFileProps } from '../types'

/**
 * ファイル名生成ユーティリティ
 * TwitterMediaHarvestの機能を参考に実装
 */
export class FilenameGenerator {
  private static readonly PATH_MAX = 4096

  /**
   * ディレクトリ名の検証
   */
  static validateDirectory(directory: string): string | undefined {
    if (directory.length > this.PATH_MAX) {
      return 'Maximum path is 4096 characters.'
    }

    // 空のディレクトリ名は有効とする
    if (directory === '') {
      return undefined;
    }

    const dirPattern = /^[^<>:"/\\|?*][^<>:"\\|?*]+$/
    if (!dirPattern.test(directory)) {
      return 'Directory path contains reserved characters. (`\\`, `?`, `<`, `>`, `,`, `:`, `*`, `|`, and `"`)'
    }

    // ファイル名のサニタイズチェック
    if (!directory.split('/').every(dir => this.sanitizeFilename(dir) === dir)) {
      return 'Contains illegal characters.'
    }

    return undefined
  }

  /**
   * ファイル名パターンの検証
   */
  static validateFilenamePattern(filenamePattern: PatternToken[]): string | undefined {
    if (
      filenamePattern.includes(PatternToken.Hash) ||
      (filenamePattern.includes(PatternToken.TweetId) &&
        filenamePattern.includes(PatternToken.Serial))
    ) {
      return undefined
    }
    return 'The pattern should contains at least {hash} or {tweetId} and {serial}'
  }

  /**
   * ファイル名設定の検証
   */
  static validateFilenameSettings(settings: FilenameSettingProps): string | undefined {
    const invalidDirectoryReason = this.validateDirectory(settings.directory)
    if (invalidDirectoryReason) return invalidDirectoryReason

    const invalidPatternReason = this.validateFilenamePattern(settings.filenamePattern)
    if (invalidPatternReason) return invalidPatternReason

    return undefined
  }

  /**
   * ファイル名を生成
   */
  static makeFilename(
    mediaFile: TweetMediaFileProps,
    settings: FilenameSettingProps,
    options?: { noDir?: boolean }
  ): string {
    const { screenName, userId, id, createdAt, hash, serial } = {
      screenName: mediaFile.tweetUser.screenName,
      userId: mediaFile.tweetUser.userId,
      id: mediaFile.tweetId,
      createdAt: mediaFile.createdAt,
      hash: mediaFile.hash,
      serial: mediaFile.serial,
    }
    const currentDate = new Date()

    if (settings.filenamePattern.length === 0) {
      throw new Error("Filename pattern can't be empty.")
    }

    const filename = settings.filenamePattern
      .join('-')
      .replace(PatternToken.Account, screenName)
      .replace(PatternToken.TweetId, id)
      .replace(PatternToken.Serial, String(serial).padStart(2, '0'))
      .replace(PatternToken.Hash, hash)
      .replace(PatternToken.Date, this.makeDateString(currentDate))
      .replace(PatternToken.Datetime, this.makeDatetimeString(currentDate))
      .replace(PatternToken.TweetDate, this.makeDateString(createdAt))
      .replace(PatternToken.TweetDatetime, this.makeDatetimeString(createdAt))
      .replace(PatternToken.AccountId, userId)
      .replace(
        PatternToken.UnderscoreDateTime,
        this.makeUnderscoreDatetimeString(currentDate)
      )
      .replace(
        PatternToken.UnderscroeTweetDatetime,
        this.makeUnderscoreDatetimeString(createdAt)
      )
      .replace(PatternToken.TweetTimestamp, createdAt.getTime().toString())
      .replace(PatternToken.Timestamp, currentDate.getTime().toString())

    const dir = options?.noDir
      ? undefined
      : this.makeAggregationDirectory(mediaFile, settings)

    return this.formatPath({
      dir,
      name: filename,
      ext: mediaFile.ext,
    })
  }

  /**
   * 集約ディレクトリを生成
   */
  private static makeAggregationDirectory(
    mediaFile: TweetMediaFileProps,
    settings: FilenameSettingProps
  ): string {
    const baseDir = settings.noSubDirectory ? '' : settings.directory

    if (!settings.fileAggregation) return baseDir

    switch (settings.groupBy) {
      case AggregationToken.Account:
        return this.joinPath(baseDir, mediaFile.tweetUser.screenName)

      default:
        throw new Error('Invalid `groupBy` settings: ' + settings.groupBy)
    }
  }

  /**
   * 日付文字列を生成（YYYYMMDD）
   */
  private static makeDateString(date: Date): string {
    return (
      String(date.getFullYear()) +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0')
    )
  }

  /**
   * 日時文字列を生成（YYYYMMDDHHMMSS）
   */
  private static makeDatetimeString(date: Date): string {
    return (
      this.makeDateString(date) +
      String(date.getHours()).padStart(2, '0') +
      String(date.getMinutes()).padStart(2, '0') +
      String(date.getSeconds()).padStart(2, '0')
    )
  }

  /**
   * アンダースコア付き日時文字列を生成（YYYYMMDD_HHMMSS）
   */
  private static makeUnderscoreDatetimeString(date: Date): string {
    return (
      this.makeDateString(date) +
      '_' +
      String(date.getHours()).padStart(2, '0') +
      String(date.getMinutes()).padStart(2, '0') +
      String(date.getSeconds()).padStart(2, '0')
    )
  }

  /**
   * ファイル名をサニタイズ
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/^\.+/, '')
      .replace(/\.+$/, '')
  }

  /**
   * パスを結合
   */
  private static joinPath(...paths: string[]): string {
    return paths.filter(Boolean).join('/')
  }

  /**
   * パスをフォーマット
   */
  private static formatPath(pathObj: { dir?: string; name: string; ext: string }): string {
    const { dir, name, ext } = pathObj
    const filename = this.sanitizeFilename(name) + (ext.startsWith('.') ? ext : '.' + ext)
    return dir ? this.joinPath(dir, filename) : filename
  }

  /**
   * デフォルトのファイル名設定を取得
   */
  static getDefaultFilenameSettings(): FilenameSettingProps {
    return {
      directory: 'comiketter',
      noSubDirectory: false,
      filenamePattern: [
        PatternToken.Account,
        PatternToken.TweetId,
        PatternToken.Serial,
      ],
      fileAggregation: true,
      groupBy: AggregationToken.Account,
    }
  }

  /**
   * ファイル名設定のプレビューを生成
   */
  static generatePreview(settings: FilenameSettingProps): string {
    const previewMediaFile: TweetMediaFileProps = {
      tweetId: '1145141919810',
      tweetUser: {
        screenName: 'tweetUser',
        userId: '306048589',
        displayName: 'NickName',
        isProtected: false,
      },
      createdAt: new Date(2024, 1, 2, 12, 5, 38),
      serial: 2,
      hash: '2vfn8shkjvd98892pR',
      source: 'https://somewhere.com',
      type: 'image',
      ext: 'jpg',
    }

    return this.makeFilename(previewMediaFile, settings, { noDir: true })
  }

  /**
   * パターントークンの一覧を取得する
   * @returns パターントークンの説明付きリスト
   */
  static getPatternTokenDescriptions(): Array<{
    token: PatternToken;
    description: string;
    example: string;
  }> {
    return [
      { token: PatternToken.Account, description: 'アカウント名（screenName）', example: 'elonMask' },
      { token: PatternToken.AccountId, description: 'アカウントID（userId）', example: '44196397' },
      { token: PatternToken.TweetId, description: 'ツイートID', example: '1145141919810' },
      { token: PatternToken.Serial, description: 'シリアル番号（メディアファイルの順番）', example: '01' },
      { token: PatternToken.Hash, description: 'ハッシュ値', example: 'abc123' },
      { token: PatternToken.Date, description: 'ダウンロード日付（YYYYMMDD）', example: '20241201' },
      { token: PatternToken.Datetime, description: 'ダウンロード日時（YYYYMMDDHHMMSS）', example: '20241201143000' },
      { token: PatternToken.UnderscoreDateTime, description: 'ダウンロード日時（YYYYMMDD_HHMMSS）', example: '20241201_143000' },
      { token: PatternToken.Timestamp, description: 'ダウンロードタイムスタンプ', example: '1701432000000' },
      { token: PatternToken.TweetDate, description: 'ツイート投稿日付（YYYYMMDD）', example: '20241201' },
      { token: PatternToken.TweetDatetime, description: 'ツイート投稿日時（YYYYMMDDHHMMSS）', example: '20241201143000' },
      { token: PatternToken.UnderscroeTweetDatetime, description: 'ツイート投稿日時（YYYYMMDD_HHMMSS）', example: '20241201_143000' },
      { token: PatternToken.TweetTimestamp, description: 'ツイート投稿タイムスタンプ', example: '1701432000000' },
    ];
  }
} 