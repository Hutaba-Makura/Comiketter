/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Modified and adapted from TwitterMediaHarvest injectFetch.ts
 */

import type { 
  MakeTransactionId, 
  WebPackModuleItem, 
  Module, 
  ESModule, 
  WebpackLoadFunction 
} from '@/types/api';

export {}

let generateTransactionId: MakeTransactionId;

type TxTarget = {
  method: string;
  path: string;
};

// リクエストパスを保存するWeakMap
const requestPathWeakMap = new WeakMap<XMLHttpRequest, TxTarget>();

// リスナー登録済みのXMLHttpRequestインスタンスを管理するWeakMap
const listenerAddedWeakMap = new WeakMap<XMLHttpRequest, boolean>();

// fetch APIの重複処理を防ぐための管理
const processingFetchRequests = new Map<string, number>();

// 古いリクエスト記録をクリーンアップする関数
function cleanupOldFetchRequests(): void {
  const currentTime = Date.now();
  const cutoffTime = currentTime - 5000; // 5秒前より古い記録を削除
  
  for (const [key, timestamp] of processingFetchRequests.entries()) {
    if (timestamp < cutoffTime) {
      processingFetchRequests.delete(key);
    }
  }
}

const Pattern = Object.freeze({
  tweetRelated:
    /^(?:\/i\/api)?\/graphql\/(?<queryId>.+)?\/(?<queryName>TweetDetail|TweetResultByRestId|HomeTimeline|HomeLatestTimeline|ListLatestTweetsTimeline|SearchTimeline|CommunityTweetsTimeline|CommunityTweetSearchModuleQuery|Bookmarks|BookmarkSearchTimeline|UserTweets|UserTweetsAndReplies|Likes|UserHighlightsTweets|CreateBookmarks|DeleteBookmark|FavoriteTweet|UnfavoriteTweet|CreateRetweet|DeleteRetweet|CreateTweet|UserMedia|NotificationsTimeline)$/,
    // |useUpsellTrackingMutation 画面縦横比変更追跡はコメントアウト
});

// API種類の定義
const ApiTypes = {
  HomeTimeline: 'HomeTimeline',
  HomeLatestTimeline: 'HomeLatestTimeline',
  TweetDetail: 'TweetDetail',
  TweetResultByRestId: 'TweetResultByRestId',
  ListLatestTweetsTimeline: 'ListLatestTweetsTimeline',
  SearchTimeline: 'SearchTimeline',
  CommunityTweetsTimeline: 'CommunityTweetsTimeline',
  CommunityTweetSearchModuleQuery: 'CommunityTweetSearchModuleQuery',
  Bookmarks: 'Bookmarks',
  BookmarkSearchTimeline: 'BookmarkSearchTimeline',
  UserTweets: 'UserTweets',
  UserTweetsAndReplies: 'UserTweetsAndReplies',
  Likes: 'Likes',
  UserHighlightsTweets: 'UserHighlightsTweets',
  CreateBookmarks: 'CreateBookmarks',
  DeleteBookmark: 'DeleteBookmark',
  FavoriteTweet: 'FavoriteTweet',
  UnfavoriteTweet: 'UnfavoriteTweet',
  CreateRetweet: 'CreateRetweet',
  DeleteRetweet: 'DeleteRetweet',
  CreateTweet: 'CreateTweet',
  UserMedia: 'UserMedia',
  NotificationsTimeline: 'NotificationsTimeline',
  // useUpsellTrackingMutation: 'useUpsellTrackingMutation', // 画面縦横比変更追跡はコメントアウト
} as const;

import { getText, getTextObject } from './i18n';

// API種類を日本語で表示するマッピング
// messages.jsonのapi_type_labelsから一度の呼び出しで取得
function getApiTypeLabel(apiType: string): string {
  const labels = getTextObject<Record<string, string>>('api_type_labels');
  return labels[apiType] || apiType;
}

const enum ComiketterEvent {
  ApiResponse = 'comiketter:api-response',
  ResponseTransactionId = 'comiketter:tx-id:response',
  RequestTransactionId = 'comiketter:tx-id:request',
}

/**
 * URLの妥当性を検証し、有効なURLオブジェクトを返す
 * @param url 検証するURL文字列またはURLオブジェクト
 * @returns 有効なURLオブジェクト、またはundefined
 */
function validateUrl(url: string | URL | undefined): URL | undefined {
  if (!url) return undefined;
  if (url instanceof URL) return url;
  if (URL.canParse(url)) return new URL(url);
  return undefined;
}

/**
 * URLパスからAPI種類を抽出する
 * @param pathname URLパス
 * @returns API種類
 */
function extractApiType(pathname: string): string {
  const match = pathname.match(Pattern.tweetRelated);
  if (match && match.groups?.queryName) {
    return match.groups.queryName;
  }
  return 'Unknown';
}

// Proxy XMLHttpRequest.prototype.open to intercept API calls
XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, {
  apply(target, thisArg: XMLHttpRequest, args) {
    const [method, url] = args;

    const validUrl = validateUrl(url);
    if (validUrl) {
      const matchedUrl = validUrl.pathname.match(Pattern.tweetRelated);
      if (validUrl && matchedUrl) {
        const apiType = extractApiType(validUrl.pathname);
        const apiLabel = getApiTypeLabel(apiType);
        console.log(`🔍 Comiketter: XMLHttpRequest傍受 - ${apiLabel} (${method} ${url})`);
        
        // 重複リスナー登録を防ぐため、既に登録されているかチェック
        if (!listenerAddedWeakMap.get(thisArg)) {
          thisArg.addEventListener('load', captureResponse);
          listenerAddedWeakMap.set(thisArg, true);
        }
        
        requestPathWeakMap.set(thisArg, {
          method,
          path: validUrl.pathname,
        });
      }
    }

    return Reflect.apply(target, thisArg, args);
  },
});

/**
 * XMLHttpRequestのレスポンスをキャプチャし、APIレスポンスイベントを発火する
 * @param this XMLHttpRequestインスタンス
 * @param _ev ProgressEvent（未使用）
 */
function captureResponse(this: XMLHttpRequest, _ev: ProgressEvent) {
  if (this.status === 200) {
    try {
      const url = new URL(this.responseURL);
      const apiType = extractApiType(url.pathname);
      const apiLabel = getApiTypeLabel(apiType);
      
      console.log(`📡 Comiketter: XMLHttpRequestレスポンス受信 - ${apiLabel} (ステータス: ${this.status})`);
      
      const event = new CustomEvent<Comiketter.ApiResponseDetail>(
        ComiketterEvent.ApiResponse,
        {
          detail: {
            path: url.pathname,
            status: this.status,
            body: this.responseText,
          },
        }
      );

      document.dispatchEvent(event);
    } catch (error) {
      console.error('Comiketter: Failed to parse response URL:', this.responseURL, error);
    }
  }
}

// Proxy webpackChunk to intercept dynamic module loading
self.webpackChunk_twitter_responsive_web = new Proxy<
  Window['webpackChunk_twitter_responsive_web']
>([], {
  get: function (target, prop, receiver) {
    return prop === 'push'
      ? arrayPushProxy(target.push.bind(target))
      : Reflect.get(target, prop, receiver);
  },
});

/**
 * webpackChunkのpushメソッドをプロキシして、動的モジュール読み込みを傍受する
 * @param arrayPush 元のpushメソッド
 * @returns プロキシされたpushメソッド
 */
function arrayPushProxy<T>(arrayPush: Array<T>['push']) {
  return new Proxy(arrayPush, {
    apply(method, thisArg, args: WebPackModuleItem[]) {
      return Reflect.apply(
        method,
        thisArg,
        args.map(item => {
          const [[name], module] = item;
          return name.includes('ondemand.s')
            ? [[name], moduleProxy(module)]
            : item;
        })
      );
    },
  });
}

/**
 * モジュールをプロキシして、webpackローダー関数の傍受を可能にする
 * @param module プロキシ対象のモジュール
 * @returns プロキシされたモジュール
 */
function moduleProxy(module: Module) {
  return new Proxy(module, {
    get(target, prop, receiver) {
      return typeof prop === 'symbol'
        ? Reflect.get(target, prop, receiver)
        : webpackLoaderFunctionProxy(target[prop]);
    },
  });
}

/**
 * ESモジュールをプロキシして、defaultプロパティの設定可能性を確保する
 * @param esModule プロキシ対象のESモジュール
 * @returns プロキシされたESモジュール
 */
function esModuleProxy(esModule: Partial<ESModule>) {
  return new Proxy(esModule, {
    defineProperty(target, property, attributes) {
      if (property === 'default')
        return Reflect.defineProperty(target, property, {
          ...attributes,
          configurable: true,
        });

      return Reflect.defineProperty(target, property, attributes);
    },
  });
}

/**
 * webpackローダー関数をプロキシして、トランザクションID生成器を傍受する
 * @param loaderFunc プロキシ対象のローダー関数
 * @returns プロキシされたローダー関数
 */
function webpackLoaderFunctionProxy(loaderFunc: unknown) {
  if (typeof loaderFunc !== 'function') {
    return loaderFunc;
  }
  
  return new Proxy(loaderFunc as WebpackLoadFunction, {
    apply(
      exportItem,
      thisArg,
      args: [object, Partial<ESModule>, CallableFunction]
    ) {
      const [_, esModule, loader] = args;
      const returnVal = Reflect.apply(exportItem, thisArg, [
        _,
        esModuleProxy(esModule),
        loader,
      ]);

      if (
        isESModule(esModule) &&
        isCallableFunction<() => MakeTransactionId>(esModule.default)
      ) {
        const txIdGenerator = esModule.default();
        generateTransactionId ||= txIdGenerator;
        Object.defineProperty(esModule, 'default', {
          configurable: true,
          enumerable: true,
          get: () => () => txIdGenerator,
        });
      }

      return returnVal;
    },
  });
}

/**
 * 値がESモジュールかどうかを判定する
 * @param value 判定対象の値
 * @returns ESモジュールの場合true
 */
function isESModule(value: unknown): value is ESModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__esModule' in value &&
    value.__esModule === true
  );
}

/**
 * 値が呼び出し可能な関数かどうかを判定する
 * @param value 判定対象の値
 * @returns 呼び出し可能な関数の場合true
 */
function isCallableFunction<T>(value: unknown): value is T {
  return typeof value === 'function';
}

// Handle transaction ID requests
document.addEventListener('comiketter:tx-id:request', async (e: Event) => {
  const event = e as CustomEvent<Comiketter.TxIdRequestDetail>;
  const { path, method, uuid } = event.detail;
  
  if (generateTransactionId) {
    const txId = await generateTransactionId(path, method);

    document.dispatchEvent(
      new CustomEvent<Comiketter.TxIdResponseDetail>(
        ComiketterEvent.ResponseTransactionId,
        {
          detail: {
            uuid,
            value: txId,
          },
        }
      )
    );
  }
});

// Proxy fetch API to intercept API calls
const originalFetch = window.fetch;
window.fetch = new Proxy(originalFetch, {
  apply(target, thisArg, args) {
    const [input, init] = args;
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || 'GET';
    
    try {
      const validUrl = validateUrl(url);
      if (validUrl) {
        const matchedUrl = validUrl.pathname.match(Pattern.tweetRelated);
        if (validUrl && matchedUrl) {
          const apiType = extractApiType(validUrl.pathname);
          const apiLabel = getApiTypeLabel(apiType);
          
          // 古いリクエスト記録をクリーンアップ
          cleanupOldFetchRequests();
          
          // 重複処理を防ぐため、同じURLの処理中リクエストをチェック
          const requestKey = `${method}:${validUrl.pathname}`;
          const currentTime = Date.now();
          const lastProcessTime = processingFetchRequests.get(requestKey);
          
          if (lastProcessTime && (currentTime - lastProcessTime) < 1000) {
            console.log(`🔍 Comiketter: fetch API重複処理をスキップ - ${apiLabel} (${method} ${input})`);
            return Reflect.apply(target, thisArg, args);
          }
          
          processingFetchRequests.set(requestKey, currentTime);
          console.log(`🔍 Comiketter: fetch API傍受 - ${apiLabel} (${method} ${input})`);
          
          // レスポンスを傍受するためにPromiseをラップ
          return Reflect.apply(target, thisArg, args).then((response: Response) => {
            if (response.status === 200) {
              // レスポンスのクローンを作成（元のレスポンスを保持）
              const clonedResponse = response.clone();
              clonedResponse.text().then(body => {
                console.log(`📡 Comiketter: fetch APIレスポンス受信 - ${apiLabel} (ステータス: ${response.status})`);
                
                const event = new CustomEvent<Comiketter.ApiResponseDetail>(
                  ComiketterEvent.ApiResponse,
                  {
                    detail: {
                      path: validUrl.pathname,
                      status: response.status,
                      body: body,
                    },
                  }
                );
                document.dispatchEvent(event);
              }).catch(error => {
                console.error('Comiketter: Failed to read fetch response body:', error);
              });
            }
            return response;
          });
        }
      }
    } catch (error) {
      console.error('Comiketter: Error processing fetch URL:', url, error);
    }

    return Reflect.apply(target, thisArg, args);
  },
});

// MAIN環境での初期化
console.log('Comiketter: API Interceptor initialized in MAIN world');

// イベントリスナー登録済みフラグ
let isEventListenerRegistered = false;

/**
 * X（Twitter）のAPI呼び出しを傍受し、レスポンスを処理するクラス
 * MAIN環境で実行されるため、Chrome APIは使用不可
 */
export class ApiInterceptor {
  private static instance: ApiInterceptor | null = null;

  constructor() {
    // シングルトンパターンでインスタンスを管理
    if (ApiInterceptor.instance) {
      return ApiInterceptor.instance;
    }
    ApiInterceptor.instance = this;
    // コンストラクタではinit()を呼ばない（明示的に呼ぶ）
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): ApiInterceptor {
    if (!ApiInterceptor.instance) {
      ApiInterceptor.instance = new ApiInterceptor();
    }
    return ApiInterceptor.instance;
  }

  /**
   * API傍受機能を初期化する
   * MAIN環境では直接的な処理は行わず、イベント発火のみ
   */
  async init(): Promise<void> {
    try {
      // 重複リスナー登録を防ぐため、既に登録されているかチェック
      if (!isEventListenerRegistered) {
        // APIレスポンスイベントリスナーを設定
        document.addEventListener(ComiketterEvent.ApiResponse, (event) => {
          const detail = (event as CustomEvent<Comiketter.ApiResponseDetail>).detail;
          this.handleApiResponse(detail);
        });

        isEventListenerRegistered = true;
        console.log('Comiketter: API Interceptor initialized in browser environment');
      } else {
        console.log('Comiketter: API Interceptor already initialized, skipping duplicate registration');
      }
    } catch (error) {
      console.error('Comiketter: Failed to initialize API Interceptor:', error);
    }
  }

  /**
   * キャプチャされたAPIレスポンスを処理する
   * @param detail APIレスポンスの詳細情報
   */
  private handleApiResponse(detail: Comiketter.ApiResponseDetail): void {
    try {
      const apiType = extractApiType(detail.path);
      const apiLabel = getApiTypeLabel(apiType);
      
      console.log(`🔄 Comiketter: APIレスポンス処理開始 - ${apiLabel} (ステータス: ${detail.status})`);
      
      // レスポンスボディをパース
      const data = JSON.parse(detail.body);
      
      // レスポンスの基本情報をログ出力
      console.log(`📊 Comiketter: ${apiLabel} レスポンス解析完了`, {
        path: detail.path,
        status: detail.status,
        dataSize: detail.body.length,
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : []
      });
      
      // 動画情報が含まれているかチェック
      if (this.containsVideoInfo(data)) {
        console.log(`🎥 Comiketter: ${apiLabel} で動画情報を検出しました`);
      }
      
      // バックグラウンドスクリプトに送信
      this.processApiResponse(detail.path, data);
    } catch (error) {
      console.error('Comiketter: Failed to parse API response', error);
    }
  }

  /**
   * 特定のAPIパスに対するレスポンスデータを処理し、バックグラウンドスクリプトに送信する
   * @param path APIパス
   * @param data レスポンスデータ
   */
  private processApiResponse(path: string, data: unknown): void {
    try {
      // 拡張機能コンテキストが有効かチェック
      if (!chrome?.runtime?.id) {
        // コンテキストが無効な場合は、処理をスキップ
        console.debug('Comiketter: Extension context invalidated, API response processing skipped');
        return;
      }

      const apiType = extractApiType(path);
      const apiLabel = getApiTypeLabel(apiType);
      
      console.log(`📤 Comiketter: ${apiLabel} をバックグラウンドスクリプトに送信中...`);
      
      // バックグラウンドスクリプトにAPIレスポンスを送信
      chrome.runtime.sendMessage({
        type: 'API_RESPONSE_CAPTURED',
        payload: {
          path: path,
          data: data,
          timestamp: Date.now()
        }
      }).then(() => {
        console.log(`✅ Comiketter: ${apiLabel} の送信が完了しました`);
      }).catch((error) => {
        // Extension context invalidatedエラーの場合は、エラーログを抑制
        if (error instanceof Error && error.message === 'Extension context invalidated') {
          console.debug(`Comiketter: Extension context invalidated, ${apiLabel} message ignored`);
        } else {
          console.error(`❌ Comiketter: ${apiLabel} の送信に失敗しました:`, error);
        }
      });
    } catch (error) {
      // Extension context invalidatedエラーの場合は、エラーログを抑制
      if (error instanceof Error && error.message === 'Extension context invalidated') {
        console.debug('Comiketter: Extension context invalidated, API response processing skipped');
      } else {
        console.error('Comiketter: Failed to process API response:', error);
      }
    }
  }

  /**
   * レスポンスデータに動画情報が含まれているかチェックする
   * @param data チェック対象のデータ
   * @returns 動画情報が含まれている場合true
   */
  private containsVideoInfo(data: any): boolean {
    const searchForVideoInfo = (obj: any): boolean => {
      if (!obj || typeof obj !== 'object') return false;
      
      // video_infoプロパティをチェック
      if (obj.video_info && obj.video_info.variants) {
        console.log(`🎬 Comiketter: 動画情報を検出 - variants数: ${obj.video_info.variants.length}`);
        // typeプロパティで動画をチェック
        if (obj.type === 'video' || obj.type === 'animated_gif') {
          console.log(`🎬 Comiketter: 動画メディアタイプを検出: ${obj.type}`);
        }
        return true;
      }
      
      // TODO:いつか消す
      if (obj.type === 'video' || obj.type === 'animated_gif') {
        console.log(`🎬 Comiketter: 動画メディアタイプを検出: ${obj.type}`);
        return true;
      }
      
      // 再帰的に検索
      for (const key in obj) {
        if (searchForVideoInfo(obj[key])) {
          return true;
        }
      }
      
      return false;
    };
    
    try {
      return searchForVideoInfo(data);
    } catch (error) {
      console.warn(`Comiketter: ${getText('動画情報チェック中にエラーが発生しました')}:`, error);
      return false;
    }
  }
}