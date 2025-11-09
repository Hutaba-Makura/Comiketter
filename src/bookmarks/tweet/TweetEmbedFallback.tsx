import React from 'react';
import { Alert, Text, Button, Box } from '@mantine/core';
import { IconAlertCircle, IconRefresh, IconExternalLink } from '@tabler/icons-react';
import { formatTweetId } from '../utils/format';

interface TweetEmbedFallbackProps {
  id: string;
  onRetry?: () => void;
}

/**
 * react-tweet失敗時のフォールバック表示コンポーネント
 * エラー状態を表示し、再試行やTwitterでの確認を促す
 */
export function TweetEmbedFallback({ id, onRetry }: TweetEmbedFallbackProps) {
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
        title="ツイートの読み込みに失敗しました"
        color="red"
        variant="light"
        style={{ border: 'none', borderRadius: 0 }}
      >
        <Text size="sm" mb="md" c="dimmed">
          ツイートID: {formatTweetId(id)}
        </Text>
        
        <Text size="sm" mb="md">
          このツイートを表示できませんでした。以下の原因が考えられます：
        </Text>
        
        <Box component="ul" style={{ margin: 0, paddingLeft: '20px' }}>
          <Text size="sm" component="li" mb="xs">
            ツイートが削除されている
          </Text>
          <Text size="sm" component="li" mb="xs">
            プライベートアカウントのツイート
          </Text>
          <Text size="sm" component="li" mb="xs">
            ネットワーク接続の問題
          </Text>
          <Text size="sm" component="li" mb="md">
            Twitter APIの制限
          </Text>
        </Box>

        <Box style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button 
            variant="light" 
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={handleRetry}
          >
            再試行
          </Button>
          
          <Button 
            variant="outline" 
            size="xs"
            leftSection={<IconExternalLink size={14} />}
            onClick={handleOpenTwitter}
          >
            Twitterで確認
          </Button>
        </Box>
      </Alert>
    </Box>
  );
}
