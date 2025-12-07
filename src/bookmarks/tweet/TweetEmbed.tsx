import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text } from '@mantine/core';
import { Tweet } from 'react-tweet';
import { useThemeBridge } from '../hooks/useThemeBridge';
import { TweetEmbedFallback } from './TweetEmbedFallback';
import { getTextSync, getLanguage, clearLanguageCache } from '../utils/i18n';

interface TweetEmbedProps {
  id: string;
}

/**
 * ツイート表示コンポーネント
 * react-tweetを使用した美しいツイート表示
 */
export function TweetEmbed({ id }: TweetEmbedProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [languageKey, setLanguageKey] = useState(0); // 言語変更時に再レンダリングをトリガー
  const { themeValue } = useThemeBridge();

  // 言語設定を取得してキャッシュに保存
  useEffect(() => {
    const initLanguage = async () => {
      await getLanguage();
    };
    initLanguage();
  }, []);

  // ストレージ変更を監視して言語設定の変更を検知
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.comiketter_settings) {
        // 言語設定が変更された場合、キャッシュをクリアして再取得
        clearLanguageCache();
        getLanguage().then(() => {
          // 強制的に再レンダリング（言語キーを変更）
          setLanguageKey(prev => prev + 1);
        });
      }
    };

    // ストレージ変更イベントをリッスン
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // languageKeyが変更された時に再レンダリングを確実にする
  useEffect(() => {
    // languageKeyが変更された時、コンポーネントが再レンダリングされ、
    // getTextSyncが再実行されるため、新しい言語が反映される
  }, [languageKey]);

  // エラーハンドラー（レンダリング中の状態更新を避ける）
  const handleError = useCallback(() => {
    console.error('react-tweet error for tweet:', id);
    // レンダリング中を避けるため、次のティックで実行
    setTimeout(() => {
      setHasError(true);
      setIsLoading(false);
    }, 0);
  }, [id]);

  // ローディング状態を自動的に管理
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 2000); // 2秒後にローディングを終了

    return () => clearTimeout(timer);
  }, [isLoading]);

  // react-tweetが失敗した場合のフォールバック
  if (hasError) {
    return (
      <TweetEmbedFallback 
        id={id}
        onRetry={() => {
          setHasError(false);
          setIsLoading(true);
        }}
      />
    );
  }

  return (
    <Box
      data-theme={themeValue}
      style={{
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      {/* ローディングオーバーレイ */}
      {isLoading && (
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <Text size="sm" c="dimmed">{getTextSync('loading')}</Text>
        </Box>
      )}
      
      <Tweet 
        id={id}
        onError={handleError}
        components={{
          // カスタムコンポーネントを追加（必要に応じて）
        }}
      />
    </Box>
  );
}
