// Download Manager for media download functionality
import { FilenameGenerator } from '@/utils/filenameGenerator';
import { StorageManager } from '@/utils/storage';
import type { TweetMediaFileProps, DownloadHistory, AppSettings } from '@/types';

export class DownloadManager {
  private settings: AppSettings | null = null;

  constructor() {
    // TODO: Initialize download management
  }

  async init(): Promise<void> {
    console.log('Comiketter: DownloadManager initialized');
    
    // 設定を読み込み
    try {
      this.settings = await StorageManager.getSettings();
      console.log('Comiketter: Settings loaded for DownloadManager');
    } catch (error) {
      console.error('Comiketter: Failed to load settings for DownloadManager:', error);
    }
  }

  /**
   * APIレスポンスを処理し、必要に応じてダウンロードを実行する
   * @param message APIレスポンスメッセージ
   */
  processApiResponse(message: {
    path: string;
    data: unknown;
    timestamp: number;
  }): void {
    console.log('Comiketter: DownloadManager processing API response:', message.path);
    
    // TODO: 特定のAPIパスに対する処理を実装
    // 例: ツイート情報の抽出、メディアURLの取得、ダウンロード実行など
    
    // 現在はログ出力のみ
    if (message.path.includes('/graphql/')) {
      console.log('Comiketter: GraphQL API response detected');
      // TODO: GraphQLレスポンスの解析とダウンロード処理
    }
  }

  /**
   * メディアファイルをダウンロードする
   * @param mediaFile メディアファイル情報
   * @param settings 設定（省略時は現在の設定を使用）
   */
  async downloadMediaFile(
    mediaFile: TweetMediaFileProps,
    settings?: AppSettings
  ): Promise<DownloadHistory> {
    const currentSettings = settings || this.settings;
    if (!currentSettings) {
      throw new Error('Settings not available for download');
    }

    try {
      // ファイル名を生成
      const filename = FilenameGenerator.makeFilename(mediaFile, currentSettings.filenameSettings);
      
      // ダウンロード実行
      const downloadId = await this.executeDownload(mediaFile.source, filename, currentSettings);
      
      // ダウンロード履歴を作成
      const downloadHistory: Omit<DownloadHistory, 'id'> = {
        tweetId: mediaFile.tweetId,
        fileName: filename,
        filePath: filename, // 実際のパスはChromeが管理
        downloadUrl: mediaFile.source,
        downloadedAt: new Date().toISOString(),
        downloadMethod: currentSettings.downloadMethod,
        accountName: mediaFile.tweetUser.screenName,
        mediaUrl: mediaFile.source,
        status: 'pending',
      };

      // 履歴を保存
      const savedHistory = await StorageManager.addDownloadHistory(downloadHistory);
      
      console.log('Comiketter: Media file download started:', filename);
      return savedHistory;
    } catch (error) {
      console.error('Comiketter: Failed to download media file:', error);
      throw error;
    }
  }

  /**
   * 実際のダウンロードを実行する
   * @param url ダウンロードURL
   * @param filename ファイル名
   * @param settings 設定
   * @returns ダウンロードID
   */
  private async executeDownload(
    url: string,
    filename: string,
    settings: AppSettings
  ): Promise<number> {
    if (settings.downloadMethod === 'chrome-api') {
      return this.downloadWithChromeAPI(url, filename);
    } else {
      return this.downloadWithNativeMessaging(url, filename);
    }
  }

  /**
   * Chrome Downloads APIを使用してダウンロード
   * @param url ダウンロードURL
   * @param filename ファイル名
   * @returns ダウンロードID
   */
  private async downloadWithChromeAPI(url: string, filename: string): Promise<number> {
    return new Promise((resolve, reject) => {
      chrome.downloads.download(
        {
          url: url,
          filename: filename,
          saveAs: false,
          conflictAction: 'uniquify',
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(downloadId);
          }
        }
      );
    });
  }

  /**
   * Native Messagingを使用してダウンロード（curl経由）
   * @param url ダウンロードURL
   * @param filename ファイル名
   * @returns ダウンロードID（ダミー値）
   */
  private async downloadWithNativeMessaging(url: string, filename: string): Promise<number> {
    // TODO: Native Messagingの実装
    // 現在はダミー実装
    console.log('Comiketter: Native messaging download requested:', { url, filename });
    
    // 実際の実装では、Native Messaging Hostとの通信を行う
    // chrome.runtime.sendNativeMessage()を使用
    
    return Date.now(); // ダミーのダウンロードID
  }

  /**
   * ダウンロード完了を処理する
   * @param downloadId ダウンロードID
   * @param success 成功フラグ
   */
  async handleDownloadComplete(downloadId: number, success: boolean): Promise<void> {
    try {
      // ダウンロード履歴を更新
      const histories = await StorageManager.getDownloadHistory();
      const history = histories.find(h => h.fileName.includes(downloadId.toString()));
      
      if (history) {
        await StorageManager.updateDownloadHistory(history.id, {
          status: success ? 'success' : 'failed',
        });
      }
      
      console.log('Comiketter: Download completed:', { downloadId, success });
    } catch (error) {
      console.error('Comiketter: Failed to handle download complete:', error);
    }
  }

  /**
   * 設定を更新する
   * @param newSettings 新しい設定
   */
  updateSettings(newSettings: AppSettings): void {
    this.settings = newSettings;
    console.log('Comiketter: DownloadManager settings updated');
  }
} 