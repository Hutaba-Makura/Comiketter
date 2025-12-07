import React, { useEffect, useState } from 'react';
import { Alert, Text, Button, Box } from '@mantine/core';
import { IconAlertCircle, IconRefresh, IconExternalLink } from '@tabler/icons-react';
import { formatTweetId } from '../utils/format';
import { getTextSync, useI18n } from '../utils/i18n';

interface TweetEmbedFallbackProps {
  id: string;
  onRetry?: () => void;
}

/**
 * react-tweet失敗時のフォールバック表示コンポーネント
 * エラー状態を表示し、再試行やTwitterでの確認を促す
 */
export function TweetEmbedFallback({ id, onRetry }: TweetEmbedFallbackProps) {
  // i18n機能を一元管理（言語設定の初期化、ストレージ変更の監視、再レンダリングのトリガー）
  useI18n();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // デフォルトの再試行処理（ページリロード）
      window.location.reload();
    }
  };

  const handleOpenTwitter = () => {
    const twitterUrl = `https://twitter.com/i/web/status/${id}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      style={{
        border: '1px solid #e1e8ed',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f8f9fa'
      }}
    >
      <Alert
        icon={<IconAlertCircle size={20} />}
        title={getTextSync('tweet_load_failed')}
        color="red"
        variant="light"
        style={{ border: 'none', borderRadius: 0 }}
      >
        <Text size="sm" mb="md" c="dimmed">
          {getTextSync('tweet_id')}: {formatTweetId(id)}
        </Text>
        
        <Text size="sm" mb="md">
          {getTextSync('tweet_cannot_display')}
        </Text>
        
        <Box component="ul" style={{ margin: 0, paddingLeft: '20px' }}>
          <Text size="sm" component="li" mb="xs">
            {getTextSync('tweet_deleted_reason')}
          </Text>
          <Text size="sm" component="li" mb="xs">
            {getTextSync('private_account_reason')}
          </Text>
          <Text size="sm" component="li" mb="xs">
            {getTextSync('network_issue_reason')}
          </Text>
          <Text size="sm" component="li" mb="md">
            {getTextSync('api_limit_reason')}
          </Text>
        </Box>

        <Box style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button 
            variant="light" 
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={handleRetry}
          >
            {getTextSync('retry')}
          </Button>
          
          <Button 
            variant="outline" 
            size="xs"
            leftSection={<IconExternalLink size={14} />}
            onClick={handleOpenTwitter}
          >
            {getTextSync('check_on_twitter')}
          </Button>
        </Box>
      </Alert>
    </Box>
  );
}
