/**
 * すべてのTwitter APIレスポンスサンプルのテスト
 * 各サンプルファイルでApiProcessorが正しく動作することを確認
 */

import { ApiProcessor } from '../api-processor/api-processor';
import * as fs from 'fs';
import * as path from 'path';

describe('ApiProcessor All Samples Test', () => {
  let apiProcessor: ApiProcessor;
  const samplesDir = path.join(__dirname, '../../TwitterAPIResponseSmaples');

  beforeEach(() => {
    apiProcessor = new ApiProcessor();
  });

  // サンプルファイルの一覧
  const sampleFiles = [
    { name: 'HomeLatestTimeline.json', apiType: 'HomeLatestTimeline', path: 'https://x.com/i/api/graphql/HomeLatestTimeline' },
    { name: 'HomeTimeline.json', apiType: 'HomeTimeline', path: 'https://x.com/i/api/graphql/HomeTimeline' },
    { name: 'TweetDetailwithGIF.json', apiType: 'TweetDetail', path: 'https://x.com/i/api/graphql/TweetDetail' },
    { name: 'TweetDetailwithText.json', apiType: 'TweetDetail', path: 'https://x.com/i/api/graphql/TweetDetail' },
    { name: 'TweetDetailwithIMG.json', apiType: 'TweetDetail', path: 'https://x.com/i/api/graphql/TweetDetail' },
    { name: 'TweetDetailwithMOV.json', apiType: 'TweetDetail', path: 'https://x.com/i/api/graphql/TweetDetail' }
  ];

  // 各サンプルファイルをテスト
  sampleFiles.forEach(({ name, apiType, path: apiPath }) => {
    it(`${name} を正しく処理できる`, async () => {
      // サンプルファイルを読み込み
      const filePath = path.join(samplesDir, name);
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const sampleData = JSON.parse(rawData);

      // APIレスポンスメッセージを作成
      const apiResponseMessage = {
        path: apiPath,
        timestamp: Date.now(),
        data: sampleData.data
      };

      // データ構造を確認
      expect(apiResponseMessage.data).toBeDefined();

      // APIタイプの判定を確認
      const extractApiType = (apiProcessor as any).extractApiType.bind(apiProcessor);
      const extractedApiType = extractApiType(apiResponseMessage.path);
      expect(extractedApiType).toBe(apiType);

      // processTweetRelatedApiの動作を確認
      const processTweetRelatedApi = (apiProcessor as any).processTweetRelatedApi.bind(apiProcessor);
      const tweetData = { data: apiResponseMessage.data };
      const tweetResult = processTweetRelatedApi(tweetData);
      expect(tweetResult.length).toBeGreaterThan(0);

      // processApiResponseWithoutCacheの動作を確認
      const result = apiProcessor.processApiResponseWithoutCache(apiResponseMessage);

      // 結果を確認
      expect(result.tweets.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);

      // 最初のツイートの基本情報を確認
      const firstTweet = result.tweets[0];
      expect(firstTweet.id_str).toBeDefined();
      expect(firstTweet.full_text).toBeDefined();
      expect(firstTweet.user.name).toBeDefined();
      expect(firstTweet.user.screen_name).toBeDefined();
      expect(firstTweet.user.avatar_url).toBeDefined();

      console.log(`${name}: ${result.tweets.length}件のツイートを抽出`);
      console.log(`  最初のツイート: ${firstTweet.id_str} - ${firstTweet.user.screen_name}`);
    });
  });

  it('すべてのサンプルで一貫した処理ができる', async () => {
    const results = [];

    for (const { name, apiType, path: apiPath } of sampleFiles) {
      // サンプルファイルを読み込み
      const filePath = path.join(samplesDir, name);
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const sampleData = JSON.parse(rawData);

      // APIレスポンスメッセージを作成
      const apiResponseMessage = {
        path: apiPath,
        timestamp: Date.now(),
        data: sampleData.data
      };

      // 処理を実行
      const result = apiProcessor.processApiResponseWithoutCache(apiResponseMessage);
      
      results.push({
        name,
        apiType,
        tweetCount: result.tweets.length,
        errorCount: result.errors.length,
        success: result.tweets.length > 0 && result.errors.length === 0
      });
    }

    // すべてのサンプルで成功していることを確認
    const allSuccessful = results.every(r => r.success);
    expect(allSuccessful).toBe(true);

    // 結果を表示
    console.log('\n=== 全サンプル処理結果 ===');
    results.forEach(r => {
      console.log(`${r.name}: ${r.tweetCount}件のツイート (${r.success ? '成功' : '失敗'})`);
    });
  });

  it('TweetDetailwithText.json の詳細デバッグ', async () => {
    // サンプルファイルを読み込み
    const filePath = path.join(samplesDir, 'TweetDetailwithText.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const sampleData = JSON.parse(rawData);

    // データ構造を確認
    expect(sampleData.data).toBeDefined();
    expect(sampleData.data.threaded_conversation_with_injections_v2).toBeDefined();
    expect(sampleData.data.threaded_conversation_with_injections_v2.instructions).toBeDefined();

    const instructions = sampleData.data.threaded_conversation_with_injections_v2.instructions;
    const timelineEntries = instructions.find((inst: any) => inst.type === 'TimelineAddEntries');
    expect(timelineEntries).toBeDefined();
    expect(timelineEntries.entries.length).toBeGreaterThan(0);

    // 最初のエントリを確認
    const firstEntry = timelineEntries.entries[0];
    const tweetResult = firstEntry.content?.itemContent?.tweet_results?.result;
    expect(tweetResult).toBeDefined();
    expect(tweetResult.legacy).toBeDefined();

    // 必須キーの存在を確認
    const hasRequiredTweetKeys = (apiProcessor as any).hasRequiredTweetKeys.bind(apiProcessor);
    const hasRequiredKeys = hasRequiredTweetKeys(tweetResult);
    
    console.log('TweetDetailwithText.json デバッグ情報:');
    console.log('  id_str:', tweetResult.legacy?.id_str);
    console.log('  full_text:', tweetResult.legacy?.full_text);
    console.log('  created_at:', tweetResult.legacy?.created_at);
    console.log('  user.name:', tweetResult.core?.user_results?.result?.core?.name);
    console.log('  user.screen_name:', tweetResult.core?.user_results?.result?.core?.screen_name);
    console.log('  hasRequiredKeys:', hasRequiredKeys);

    // 必須キーが存在する場合のみテストを続行
    if (hasRequiredKeys) {
      // APIレスポンスメッセージを作成
      const apiResponseMessage = {
        path: 'https://x.com/i/api/graphql/TweetDetail',
        timestamp: Date.now(),
        data: sampleData.data
      };

      // processTweetRelatedApiの動作を確認
      const processTweetRelatedApi = (apiProcessor as any).processTweetRelatedApi.bind(apiProcessor);
      const tweetData = { data: apiResponseMessage.data };
      const tweetResult2 = processTweetRelatedApi(tweetData);
      expect(tweetResult2.length).toBeGreaterThan(0);

      // processApiResponseWithoutCacheの動作を確認
      const result = apiProcessor.processApiResponseWithoutCache(apiResponseMessage);
      expect(result.tweets.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
    } else {
      console.log('  必須キーが不足しているため、このツイートは処理対象外です');
    }
  });

  it('TweetDetailwithText.json の必須キー確認', async () => {
    // サンプルファイルを読み込み
    const filePath = path.join(samplesDir, 'TweetDetailwithText.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const sampleData = JSON.parse(rawData);

    const instructions = sampleData.data.threaded_conversation_with_injections_v2.instructions;
    const timelineEntries = instructions.find((inst: any) => inst.type === 'TimelineAddEntries');
    const firstEntry = timelineEntries.entries[0];
    const tweetResult = firstEntry.content?.itemContent?.tweet_results?.result;

    // 必須キーを個別に確認
    const legacy = tweetResult.legacy;
    const user = tweetResult.core?.user_results?.result?.core;
    const avatar = tweetResult.core?.user_results?.result?.avatar?.image_url;

    const requiredKeys = [
      'id_str',
      'full_text',
      'created_at',
      'favorite_count',
      'retweet_count',
      'reply_count',
      'quote_count',
      'bookmarked',
      'favorited',
      'retweeted',
      'possibly_sensitive'
    ];

    console.log('TweetDetailwithText.json 必須キー確認:');
    requiredKeys.forEach(key => {
      const value = legacy[key];
      const exists = value !== undefined && value !== null;
      console.log(`  ${key}: ${exists ? '✓' : '✗'} (${value})`);
    });

    console.log(`  user.name: ${user?.name ? '✓' : '✗'} (${user?.name})`);
    console.log(`  user.screen_name: ${user?.screen_name ? '✓' : '✗'} (${user?.screen_name})`);
    console.log(`  avatar: ${avatar ? '✓' : '✗'} (${avatar})`);

    // 不足しているキーを特定
    const missingKeys = requiredKeys.filter(key => legacy[key] === undefined || legacy[key] === null);
    const missingUserInfo = !user?.name || !user?.screen_name || !avatar;

    if (missingKeys.length > 0) {
      console.log(`  不足しているlegacyキー: ${missingKeys.join(', ')}`);
    }
    if (missingUserInfo) {
      console.log('  不足しているユーザー情報があります');
    }

    // 必須キーがすべて存在する場合のみテストを続行
    if (missingKeys.length === 0 && !missingUserInfo) {
      const hasRequiredTweetKeys = (apiProcessor as any).hasRequiredTweetKeys.bind(apiProcessor);
      const hasRequiredKeys = hasRequiredTweetKeys(tweetResult);
      expect(hasRequiredKeys).toBe(true);
    } else {
      console.log('  必須キーが不足しているため、このツイートは処理対象外です');
    }
  });
}); 