/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: API Interceptor for capturing Twitter API responses
 * Modified and adapted from TwitterMediaHarvest
 */

// 型定義
type WebPackModuleItem = [string[], Module];
type Module = Record<string, unknown>;
type ESModule = {
  __esModule: true;
  default: unknown;
};
type WebpackLoadFunction = (
  _: object,
  esModule: Partial<ESModule>,
  loader: CallableFunction
) => void;
type MakeTransactionId = (path: string, method: string) => Promise<string>;

// パターンマッチング
const Pattern = {
  tweetRelated: /^\/i\/api\/graphql\/(HomeTimeline|TweetDetail|UserTweets|UserTweetsAndReplies|TweetResultByRestId|Conversation|SearchTimeline|Bookmarks)/,
} as const;

// イベント定義
const enum ComiketterEvent {
  ApiResponse = 'comiketter:api-response',
  ResponseTransactionId = 'comiketter:tx-id:response',
  RequestTransactionId = 'comiketter:tx-id:request',
}

// グローバル変数
let generateTransactionId: MakeTransactionId | undefined;

// URL検証関数
function validateUrl(url: string | URL | undefined): URL | undefined {
  if (!url) return undefined;
  try {
    return new URL(url, window.location.origin);
  } catch {
    return undefined;
  }
}

// XMLHttpRequestのプロキシ（Service Worker環境では実行しない）
if (typeof XMLHttpRequest !== 'undefined') {
  XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, {
    apply(target, thisArg: XMLHttpRequest, args) {
      const [method, url] = args;
      const validUrl = validateUrl(url);
      
      if (validUrl && validUrl.pathname.match(Pattern.tweetRelated)) {
        thisArg.addEventListener('load', captureResponse);
        console.log('Comiketter: XMLHttpRequest intercepted', method, url); // 消さないで
      }
      
      return Reflect.apply(target, thisArg, args);
    }
  });

  function captureResponse(this: XMLHttpRequest, _ev: ProgressEvent) {
    try {
      const url = validateUrl(this.responseURL);
      if (url && url.pathname.match(Pattern.tweetRelated)) {
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
      }
    } catch (error) {
      console.error('Comiketter: Error capturing XMLHttpRequest response:', error);
    }
  }
}

// Proxy webpackChunk to intercept dynamic module loading
if (typeof self !== 'undefined' && self.webpackChunk_twitter_responsive_web) {
  self.webpackChunk_twitter_responsive_web = new Proxy<
    Window['webpackChunk_twitter_responsive_web']
  >([], {
    get: function (target, prop, receiver) {
      return prop === 'push'
        ? arrayPushProxy(target.push.bind(target))
        : Reflect.get(target, prop, receiver);
    },
  });
}

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
if (typeof document !== 'undefined') {
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
}

// fetchのプロキシ（Service Worker環境では実行しない）
if (typeof fetch !== 'undefined') {
  const originalFetch = fetch;
  (globalThis as any).fetch = new Proxy(originalFetch, {
    apply(target, thisArg, args) {
      const [input, init] = args;
      const url = validateUrl(input);
      const method = init?.method || 'GET';
      
      if (url && url.pathname.match(Pattern.tweetRelated)) {
        return Reflect.apply(target, thisArg, args).then(async (response: Response) => {
          try {
            const responseClone = response.clone();
            const body = await responseClone.text();
            
            const event = new CustomEvent<Comiketter.ApiResponseDetail>(
              ComiketterEvent.ApiResponse,
              {
                detail: {
                  path: url.pathname,
                  status: response.status,
                  body: body,
                },
              }
            );
            document.dispatchEvent(event);
          } catch (error) {
            console.error('Comiketter: Failed to read fetch response body:', error);
          }
          
          return response;
        });
      }
      
      return Reflect.apply(target, thisArg, args);
    },
  });
}

/**
 * X（Twitter）のAPI呼び出しを傍受し、レスポンスを処理するクラス
 * MAIN環境で実行されるため、Chrome APIは使用不可
 */
export class ApiInterceptor {
  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    try {
      // APIレスポンスイベントリスナーを設定
      document.addEventListener(ComiketterEvent.ApiResponse, (event) => {
        const detail = (event as CustomEvent<Comiketter.ApiResponseDetail>).detail;
        this.handleApiResponse(detail);
      });

      console.log('Comiketter: API Interceptor initialized in browser environment');
    } catch (error) {
      console.error('Comiketter: Failed to initialize API Interceptor:', error);
    }
  }

  private handleApiResponse(detail: Comiketter.ApiResponseDetail): void {
    try {
      console.log('Comiketter: Processing API response for path:', detail.path);
      
      // レスポンスボディをパース
      const data = JSON.parse(detail.body);
      
      // 動画情報が含まれているかチェック
      if (this.containsVideoInfo(data)) {
        console.log('Comiketter: Video information detected in API response');
      }
      
      // バックグラウンドスクリプトに送信
      this.processApiResponse(detail.path, data);
    } catch (error) {
      console.error('Comiketter: Failed to parse API response', error);
    }
  }

  private processApiResponse(path: string, data: unknown): void {
    try {
      // バックグラウンドスクリプトにAPIレスポンスを送信
      chrome.runtime.sendMessage({
        type: 'API_RESPONSE_CAPTURED',
        payload: {
          path: path,
          data: data,
          timestamp: Date.now()
        }
      }).catch((error) => {
        console.error('Comiketter: Failed to send API response to background:', error);
      });
    } catch (error) {
      console.error('Comiketter: Failed to process API response:', error);
    }
  }

  private containsVideoInfo(data: any): boolean {
    const searchForVideoInfo = (obj: any): boolean => {
      if (!obj || typeof obj !== 'object') return false;
      
      // video_infoプロパティをチェック
      if (obj.video_info && obj.video_info.variants) {
        console.log('Comiketter: Found video_info with variants:', obj.video_info.variants.length);
        return true;
      }
      
      // typeプロパティで動画をチェック
      if (obj.type === 'video') {
        console.log('Comiketter: Found video media type:', obj.type);
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
      console.warn('Comiketter: Error checking for video info:', error);
      return false;
    }
  }
} 