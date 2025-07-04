/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: API Interceptor for capturing Twitter API responses
 * Modified and adapted from TwitterMediaHarvest
 */

// 型定義
type TxTarget = {
  method: string;
  path: string;
};

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

// Proxy fetch API to intercept API calls
if (typeof window !== 'undefined' && typeof window.fetch !== 'undefined') {
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
            // レスポンスを傍受するためにPromiseをラップ
            return Reflect.apply(target, thisArg, args).then((response: Response) => {
              if (response.status === 200) {
                // レスポンスのクローンを作成（元のレスポンスを保持）
                const clonedResponse = response.clone();
                clonedResponse.text().then(body => {
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
}

/**
 * X（Twitter）のAPI呼び出しを傍受し、レスポンスを処理するクラス
 * MAIN環境で実行されるため、Chrome APIは使用不可
 */
export class ApiInterceptor {
  constructor() {
    // Constructor
  }

  /**
   * API傍受機能を初期化する
   * MAIN環境では直接的な処理は行わず、イベント発火のみ
   */
  async init(): Promise<void> {
    console.log('Comiketter: API Interceptor initialized in browser environment');
  }

  /**
   * キャプチャされたAPIレスポンスを処理する
   * @param detail APIレスポンスの詳細情報
   */
  private handleApiResponse(detail: Comiketter.ApiResponseDetail): void {
    try {
      const responseData = JSON.parse(detail.body);
      this.processApiResponse(detail.path, responseData);
    } catch (error) {
      console.error('Comiketter: Failed to parse API response', error);
    }
  }

  /**
   * 特定のAPIパスに対するレスポンスデータを処理し、ISOLATED環境にイベント送信する
   * @param path APIパス
   * @param data レスポンスデータ
   */
  private processApiResponse(path: string, data: unknown): void {
    // MAIN環境からISOLATED環境にイベント送信
    const event = new CustomEvent('comiketter:api-response-processed', {
      detail: {
        path,
        data,
        timestamp: Date.now(),
      },
    });
    document.dispatchEvent(event);
  }
} 