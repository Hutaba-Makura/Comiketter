import React, { useState } from 'react';
import { Group, Text, ActionIcon, Box } from '@mantine/core';
import { IconHeart, IconRepeat, IconMessage, IconShare } from '@tabler/icons-react';
import { TweetStats as TweetStatsType } from '../types/tweet';
import { formatCount } from '../utils/format';

interface TweetStatsProps {
  stats: TweetStatsType;
}

/**
 * ツイート統計コンポーネント（フォールバック用）
 */
export function TweetStats({ stats }: TweetStatsProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [likeCount, setLikeCount] = useState(stats.likeCount);
  const [retweetCount, setRetweetCount] = useState(stats.retweetCount);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  const handleRetweet = () => {
    setIsRetweeted(!isRetweeted);
    setRetweetCount(isRetweeted ? retweetCount - 1 : retweetCount + 1);
  };

  const handleReply = () => {
    // TODO: リプライ機能を実装
    console.log('リプライ機能');
  };

  const handleShare = () => {
    // TODO: シェア機能を実装
    console.log('シェア機能');
  };

  return (
    <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      {/* 左側のアクションボタン */}
      <Box style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        {/* リプライ */}
        <Box 
          style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          onClick={handleReply}
        >
          <ActionIcon 
            variant="subtle" 
            size="sm" 
            color="gray"
            style={{ transition: 'all 0.2s ease' }}
          >
            <IconMessage size={16} />
          </ActionIcon>
          <Text size="xs" c="dimmed">
            {formatCount(stats.replyCount)}
          </Text>
        </Box>
        
        {/* リツイート */}
        <Box 
          style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          onClick={handleRetweet}
        >
          <ActionIcon 
            variant="subtle" 
            size="sm" 
            color={isRetweeted ? "green" : "gray"}
            style={{ transition: 'all 0.2s ease' }}
          >
            <IconRepeat size={16} />
          </ActionIcon>
          <Text size="xs" c={isRetweeted ? "green" : "dimmed"}>
            {formatCount(retweetCount)}
          </Text>
        </Box>
        
        {/* いいね */}
        <Box 
          style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          onClick={handleLike}
        >
          <ActionIcon 
            variant="subtle" 
            size="sm" 
            color={isLiked ? "red" : "gray"}
            style={{ transition: 'all 0.2s ease' }}
          >
            <IconHeart size={16} fill={isLiked ? "currentColor" : "none"} />
          </ActionIcon>
          <Text size="xs" c={isLiked ? "red" : "dimmed"}>
            {formatCount(likeCount)}
          </Text>
        </Box>
      </Box>
      
      {/* 右側のシェアボタン */}
      <ActionIcon 
        variant="subtle" 
        size="sm" 
        color="gray"
        onClick={handleShare}
        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
      >
        <IconShare size={16} />
      </ActionIcon>
    </Box>
  );
}
