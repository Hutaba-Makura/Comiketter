/**
 * ApiProcessor デバッグテスト
 * 実際のAPIレスポンスデータを使用してデバッグ
 */

import { ApiProcessor } from '../api-processor/api-processor';
import * as fs from 'fs';
import * as path from 'path';

describe('ApiProcessor Debug with Real Data', () => {
  let apiProcessor: ApiProcessor;
  let realApiData: any;

  beforeAll(() => {
    // 実際のAPIレスポンスデータを読み込み
    const dataPath = path.join(__dirname, '../../TwitterAPIResponseSmaples/HomeLatestTimeline.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    realApiData = JSON.parse(rawData);
  });

  beforeEach(() => {
    apiProcessor = new ApiProcessor();
  });

  it('実際のAPIレスポンス構造を確認', () => {
    console.log('APIレスポンス構造:', JSON.stringify(realApiData.data, null, 2).substring(0, 1000));
    
    // データ構造を確認
    expect(realApiData.data).toBeDefined();
    expect(realApiData.data.home).toBeDefined();
    expect(realApiData.data.home.home_timeline_urt).toBeDefined();
    expect(realApiData.data.home.home_timeline_urt.instructions).toBeDefined();
  });

  it('実際のツイートデータ構造を確認', () => {
    const instructions = realApiData.data.home.home_timeline_urt.instructions;
    const timelineEntries = instructions.find((inst: any) => inst.type === 'TimelineAddEntries');
    
    if (timelineEntries && timelineEntries.entries.length > 0) {
      const firstEntry = timelineEntries.entries[0];
      const tweetResult = firstEntry.content?.itemContent?.tweet_results?.result;
      
      console.log('ツイート結果構造:', JSON.stringify(tweetResult, null, 2).substring(0, 1000));
      
      expect(tweetResult).toBeDefined();
      expect(tweetResult.legacy).toBeDefined();
      expect(tweetResult.core).toBeDefined();
      expect(tweetResult.core.user_results).toBeDefined();
    }
  });

  it('hasRequiredTweetKeysの動作を実際のデータで確認', () => {
    const instructions = realApiData.data.home.home_timeline_urt.instructions;
    const timelineEntries = instructions.find((inst: any) => inst.type === 'TimelineAddEntries');
    
    if (timelineEntries && timelineEntries.entries.length > 0) {
      const firstEntry = timelineEntries.entries[0];
      const tweetResult = firstEntry.content?.itemContent?.tweet_results?.result;
      
      // private メソッドをテストするため、any でアクセス
      const hasRequiredTweetKeys = (apiProcessor as any).hasRequiredTweetKeys.bind(apiProcessor);
      
      console.log('必須キーチェック結果:', hasRequiredTweetKeys(tweetResult));
      console.log('ツイートID:', tweetResult.legacy?.id_str);
      console.log('ユーザー名:', tweetResult.core?.user_results?.result?.core?.name);
      
      expect(hasRequiredTweetKeys(tweetResult)).toBe(true);
    }
  });

  it('processTweetRelatedApiの詳細テスト', () => {
    // 実際のデータ構造でテスト
    const testData = {
      data: realApiData.data
    };
    
    // private メソッドをテストするため、any でアクセス
    const processTweetRelatedApi = (apiProcessor as any).processTweetRelatedApi.bind(apiProcessor);
    const result = processTweetRelatedApi(testData);
    
    console.log('processTweetRelatedApi結果:', result.length);
    if (result.length > 0) {
      console.log('最初のツイート:', result[0].id_str, result[0].full_text);
    }
    
    expect(result.length).toBeGreaterThan(0);
  });

  it('extractTweetsFromInstructionsの詳細テスト', () => {
    const instructions = realApiData.data.home.home_timeline_urt.instructions;
    
    // private メソッドをテストするため、any でアクセス
    const extractTweetsFromInstructions = (apiProcessor as any).extractTweetsFromInstructions.bind(apiProcessor);
    const result = extractTweetsFromInstructions(instructions);
    
    console.log('extractTweetsFromInstructions結果:', result.length);
    if (result.length > 0) {
      console.log('最初のツイート:', result[0].id_str, result[0].full_text);
    }
    
    expect(result.length).toBeGreaterThan(0);
  });

  it('完全なAPIレスポンス処理をテスト（キャッシュ無効）', async () => {
    const apiResponseMessage = {
      path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
      timestamp: Date.now(),
      data: realApiData.data
    };
    
    // データ構造を確認
    expect(apiResponseMessage.data).toBeDefined();
    expect(apiResponseMessage.data.home).toBeDefined();
    expect(apiResponseMessage.data.home.home_timeline_urt).toBeDefined();
    expect(apiResponseMessage.data.home.home_timeline_urt.instructions).toBeDefined();
    
    // private メソッドでAPIタイプを確認
    const extractApiType = (apiProcessor as any).extractApiType.bind(apiProcessor);
    const apiType = extractApiType(apiResponseMessage.path);
    expect(apiType).toBe('HomeLatestTimeline');
    
    // 実際のデータ構造を確認
    const instructions = apiResponseMessage.data.home.home_timeline_urt.instructions;
    const timelineEntries = instructions.find((inst: any) => inst.type === 'TimelineAddEntries');
    expect(timelineEntries).toBeDefined();
    expect(timelineEntries.entries.length).toBeGreaterThan(0);
    
    // キャッシュ無効でテスト
    const result = await apiProcessor.processApiResponseWithoutCache(apiResponseMessage);
    
    // 結果を確認
    expect(result.tweets.length).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);
    
    if (result.tweets.length > 0) {
      expect(result.tweets[0].id_str).toBeDefined();
      expect(result.tweets[0].full_text).toBeDefined();
      expect(result.tweets[0].user.name).toBeDefined();
    }
  });

  it('processApiResponseWithoutCacheの詳細テスト', async () => {
    const apiResponseMessage = {
      path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
      timestamp: Date.now(),
      data: realApiData.data
    };
    
    // APIタイプの判定を確認
    const extractApiType = (apiProcessor as any).extractApiType.bind(apiProcessor);
    const apiType = extractApiType(apiResponseMessage.path);
    expect(apiType).toBe('HomeLatestTimeline');
    
    // データ構造を確認
    expect(apiResponseMessage.data).toBeDefined();
    expect(apiResponseMessage.data.home).toBeDefined();
    expect(apiResponseMessage.data.home.home_timeline_urt).toBeDefined();
    expect(apiResponseMessage.data.home.home_timeline_urt.instructions).toBeDefined();
    
    // processTweetRelatedApiの動作を確認（正しい構造で）
    const processTweetRelatedApi = (apiProcessor as any).processTweetRelatedApi.bind(apiProcessor);
    const correctData = { data: apiResponseMessage.data };
    const tweetResult = processTweetRelatedApi(correctData);
    expect(tweetResult.length).toBeGreaterThan(0);
    
    // processApiResponseWithoutCacheの動作を確認
    const result = await apiProcessor.processApiResponseWithoutCache(apiResponseMessage);
    
    expect(result.tweets.length).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);
  });

  it('データ構造の詳細比較', () => {
    // 実際のデータ構造
    const actualData = {
      data: realApiData.data
    };
    
    // データ構造を確認
    expect(actualData.data).toBeDefined();
    expect(actualData.data.home).toBeDefined();
    expect(actualData.data.home.home_timeline_urt).toBeDefined();
    expect(actualData.data.home.home_timeline_urt.instructions).toBeDefined();
    
    // processTweetRelatedApiの動作を確認
    const processTweetRelatedApi = (apiProcessor as any).processTweetRelatedApi.bind(apiProcessor);
    
    // 実際のデータでテスト
    const result1 = processTweetRelatedApi(actualData);
    expect(result1.length).toBeGreaterThan(0);
    
    // 期待される構造でテスト
    const expectedStructure = {
      data: {
        home: {
          home_timeline_urt: actualData.data.home.home_timeline_urt
        }
      }
    };
    const result2 = processTweetRelatedApi(expectedStructure);
    expect(result2.length).toBeGreaterThan(0);
    
    // 結果を比較
    expect(result1.length).toBe(result2.length);
  });
}); 