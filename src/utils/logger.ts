/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Enhanced logging utility
 */

export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
}

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isEnabled = true;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * ログを記録
   */
  log(level: LogLevel, message: string, data?: any, context?: string): void {
    if (!this.isEnabled) return;

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
    };

    this.logs.push(entry);

    // ログ数制限
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // コンソールに出力
    this.outputToConsole(entry);

    // バックグラウンドスクリプトに送信
    this.sendToBackground(entry);
  }

  /**
   * デバッグログ
   */
  debug(message: string, data?: any, context?: string): void {
    this.log(LogLevel.Debug, message, data, context);
  }

  /**
   * 情報ログ
   */
  info(message: string, data?: any, context?: string): void {
    this.log(LogLevel.Info, message, data, context);
  }

  /**
   * 警告ログ
   */
  warn(message: string, data?: any, context?: string): void {
    this.log(LogLevel.Warn, message, data, context);
  }

  /**
   * エラーログ
   */
  error(message: string, data?: any, context?: string): void {
    this.log(LogLevel.Error, message, data, context);
  }

  /**
   * コンソールに出力
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[Comiketter${entry.context ? `:${entry.context}` : ''}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.Debug:
        console.debug(message, entry.data);
        break;
      case LogLevel.Info:
        console.info(message, entry.data);
        break;
      case LogLevel.Warn:
        console.warn(message, entry.data);
        break;
      case LogLevel.Error:
        console.error(message, entry.data);
        break;
    }
  }

  /**
   * バックグラウンドスクリプトに送信
   */
  private sendToBackground(entry: LogEntry): void {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'LOG',
          payload: entry,
        }).catch(() => {
          // 送信に失敗しても無視
        });
      }
    } catch (error) {
      // chrome.runtimeが利用できない場合は無視
    }
  }

  /**
   * ログを取得
   */
  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  /**
   * ログをクリア
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * ログ機能を有効/無効化
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * ログ機能が有効かどうか
   */
  isLoggingEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * ログ統計を取得
   */
  getLogStats(): { total: number; byLevel: Record<LogLevel, number> } {
    const byLevel: Record<LogLevel, number> = {
      [LogLevel.Debug]: 0,
      [LogLevel.Info]: 0,
      [LogLevel.Warn]: 0,
      [LogLevel.Error]: 0,
    };

    this.logs.forEach(log => {
      byLevel[log.level]++;
    });

    return {
      total: this.logs.length,
      byLevel,
    };
  }
}

// グローバルインスタンス
export const logger = Logger.getInstance(); 