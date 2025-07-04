/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: API related type definitions
 */

declare global {
  namespace Comiketter {
    interface ApiResponseDetail {
      path: string;
      status: number;
      body: string;
    }

    interface TxIdRequestDetail {
      path: string;
      method: string;
      uuid: string;
    }

    interface TxIdResponseDetail {
      uuid: string;
      value: string;
    }
  }
}

export type MakeTransactionId = (path: string, method: string) => Promise<string>;

export type WebPackModuleItem = [string[], Module];

export interface Module {
  [key: string]: unknown;
}

export interface ESModule {
  __esModule: true;
  default: unknown;
}

export type WebpackLoadFunction = (
  _: object,
  esModule: Partial<ESModule>,
  loader: CallableFunction
) => void;

export {};

export declare namespace Comiketter {
  interface ApiResponseProcessedDetail {
    path: string;
    data: unknown;
    timestamp: number;
  }
}

interface CustomEventMap {
  'comiketter:api-response': CustomEvent<Comiketter.ApiResponseDetail>;
  'comiketter:api-response-processed': CustomEvent<Comiketter.ApiResponseProcessedDetail>;
  'comiketter:tx-id:request': CustomEvent<Comiketter.TxIdRequestDetail>;
  'comiketter:tx-id:response': CustomEvent<Comiketter.TxIdResponseDetail>;
}

interface DocumentEventMap extends CustomEventMap {}

declare global {
  interface Window {
    webpackChunk_twitter_responsive_web: WebPackModuleItem[];
  }
} 