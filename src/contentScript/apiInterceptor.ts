/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Modified and adapted from TwitterMediaHarvest injectFetch.ts
 */

import type { 
  Comiketter, 
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

const requestPathWeakMap = new WeakMap<XMLHttpRequest, TxTarget>();

const Pattern = Object.freeze({
  tweetRelated:
    /^(?:\/i\/api)?\/graphql\/(?<queryId>.+)?\/(?<queryName>TweetDetail|TweetResultByRestId|UserTweets|UserMedia|HomeTimeline|HomeLatestTimeline|UserTweetsAndReplies|UserHighlightsTweets|UserArticlesTweets|Bookmarks|Likes|CommunitiesExploreTimeline|ListLatestTweetsTimeline|SearchTimeline|UserByScreenName|UserByRestId)$/,
});

const enum ComiketterEvent {
  ApiResponse = 'comiketter:api-response',
  ResponseTransactionId = 'comiketter:tx-id:response',
  RequestTransactionId = 'comiketter:tx-id:request',
}

function validateUrl(url: string | URL | undefined): URL | undefined {
  if (!url) return undefined;
  if (url instanceof URL) return url;
  if (URL.canParse(url)) return new URL(url);
  return undefined;
}

// Proxy XMLHttpRequest.prototype.open to intercept API calls
XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, {
  apply(target, thisArg: XMLHttpRequest, args) {
    const [method, url] = args;

    const validUrl = validateUrl(url);
    if (validUrl) {
      const matchedUrl = validUrl.pathname.match(Pattern.tweetRelated);
      if (validUrl && matchedUrl) {
        console.log('Comiketter: URL matched pattern, adding listener:', validUrl.pathname);
        thisArg.addEventListener('load', captureResponse);
        requestPathWeakMap.set(thisArg, {
          method,
          path: validUrl.pathname,
        });
      }
    }

    return Reflect.apply(target, thisArg, args);
  },
});

function captureResponse(this: XMLHttpRequest, _ev: ProgressEvent) {
  if (this.status === 200) {
    const url = URL.parse(this.responseURL);
    if (!url) return;

    console.log('Comiketter: Response captured for:', url.pathname);
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

function moduleProxy(module: Module) {
  return new Proxy(module, {
    get(target, prop, receiver) {
      return typeof prop === 'symbol'
        ? Reflect.get(target, prop, receiver)
        : webpackLoaderFunctionProxy(target[prop]);
    },
  });
}

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

function webpackLoaderFunctionProxy(loaderFunc: WebpackLoadFunction) {
  return new Proxy(loaderFunc, {
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

function isESModule(value: unknown): value is ESModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__esModule' in value &&
    value.__esModule === true
  );
}

function isCallableFunction<T>(value: unknown): value is T {
  return typeof value === 'function';
}

// Handle transaction ID requests
document.addEventListener('comiketter:tx-id:request', async (e: Event) => {
  const event = e as CustomEvent<Comiketter.TxIdRequestDetail>;
  const { path, method, uuid } = event.detail;
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
});

export class ApiInterceptor {
  constructor() {
    console.log('Comiketter: ApiInterceptor constructor called');
  }

  async init(): Promise<void> {
    console.log('Comiketter: ApiInterceptor initialized');
    
    // Listen for API responses
    document.addEventListener(ComiketterEvent.ApiResponse, (event: Event) => {
      const customEvent = event as CustomEvent<Comiketter.ApiResponseDetail>;
      this.handleApiResponse(customEvent.detail);
    });
  }

  private handleApiResponse(detail: Comiketter.ApiResponseDetail): void {
    console.log('Comiketter: API response captured', detail.path);
    
    try {
      const responseData = JSON.parse(detail.body);
      this.processApiResponse(detail.path, responseData);
    } catch (error) {
      console.error('Comiketter: Failed to parse API response', error);
    }
  }

  private processApiResponse(path: string, data: unknown): void {
    // TODO: Implement specific API response processing
    // This will be expanded based on the specific APIs we need to monitor
    console.log('Comiketter: Processing API response for path:', path);
    
    // Send message to background script for further processing
    chrome.runtime.sendMessage({
      type: 'API_RESPONSE_CAPTURED',
      path,
      data,
    }).catch(error => {
      console.error('Comiketter: Failed to send message to background script', error);
    });
  }
} 