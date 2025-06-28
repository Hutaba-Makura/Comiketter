/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Modified and adapted from TwitterMediaHarvest
 */

export {};

export declare namespace Comiketter {
  interface ApiResponseDetail {
    path: string;
    status: number;
    body: string;
  }

  interface TxIdRequestDetail {
    uuid: string;
    path: string;
    method: string;
  }

  interface TxIdResponseDetail {
    uuid: string;
    value: string;
  }
}

interface CustomEventMap {
  'comiketter:api-response': CustomEvent<Comiketter.ApiResponseDetail>;
  'comiketter:tx-id:request': CustomEvent<Comiketter.TxIdRequestDetail>;
  'comiketter:tx-id:response': CustomEvent<Comiketter.TxIdResponseDetail>;
}

interface DocumentEventMap extends CustomEventMap {}

export type WebpackLoadFunction = (a: unknown, b: unknown, c: unknown) => void;
export type Module = Record<number | string, WebpackLoadFunction>;
export type WebPackModuleItem = [[string], Module];
export type ESModule<T = unknown> = {
  default: T;
  __esModule: true;
};
export type MakeTransactionId = (path: string, method: string) => Promise<string>;

declare global {
  interface Window {
    webpackChunk_twitter_responsive_web: WebPackModuleItem[];
  }
} 