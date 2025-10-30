import React from 'react';
import { Paper, Stack, Text, Group, Badge, Box, Avatar, ActionIcon } from '@mantine/core';
import { IconHeart, IconRepeat, IconMessage, IconShare, IconUser, IconCheck, IconX } from '@tabler/icons-react';
import { sampleAuthors, sampleStats, sampleMediaItems, sampleTweetContents } from '../data/tweetSampleData';
import { formatTweetId, formatRelativeTime, formatCount } from '../../bookmarks/utils/format';

// Storybook専用のツイート表示コンポーネント
interface StorybookTweetProps {
  id: string;
}

export function StorybookTweet({ id }: StorybookTweetProps) {
  // ツイートIDに基づいてサンプルデータを選択
  const tweetIndex = parseInt(id.slice(-1)) || 0;
  const author = sampleAuthors[tweetIndex % sampleAuthors.length];
  const stats = sampleStats[tweetIndex % sampleStats.length];
  const content = sampleTweetContents[tweetIndex % sampleTweetContents.length];
  const media = sampleMediaItems[tweetIndex % sampleMediaItems.length];
  const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

  // 画像ライトボックス用の状態
  const [lightboxSrc, setLightboxSrc] = React.useState<string | null>(null);
  const [lightboxOrigin, setLightboxOrigin] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [lightboxStage, setLightboxStage] = React.useState<'enter' | 'entered' | 'exit' | null>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>, src: string) => {
    setLightboxOrigin({ x: e.clientX, y: e.clientY });
    setLightboxSrc(src);
    setLightboxStage('enter');
    // 次フレームでenteredにしてトランジションを発火
    requestAnimationFrame(() => setLightboxStage('entered'));
  };

  const startCloseLightbox = () => {
    setLightboxStage('exit');
    window.setTimeout(() => {
      setLightboxSrc(null);
      setLightboxStage(null);
    }, 200);
  };

  const handleCloseLightbox = () => startCloseLightbox();

  return (
    <Paper 
      p="md" 
      withBorder 
      style={{ 
        maxWidth: '598px' , 
        margin: '0 auto',
        backgroundColor: '#ffffff',
        transition: 'background-color 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.00)';
      }}
    >
      <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* ヘッダー */}
        <Box style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
          {/* プロフィール画像 */}
          <Avatar
            src={author.profileImageUrl || undefined}
            alt={author.displayName}
            size="md"
            radius="xl"
            color="blue"
            style={{ flexShrink: 0 }}
          >
            {!author.profileImageUrl && <IconUser size={20} />}
          </Avatar>
          
          {/* ユーザー情報 */}
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
            {/* ユーザー名、認証マーク、ユーザーID、時刻を横並び */}
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>
                {author.displayName}
              </Text>
              
              {author.verified && (
                <IconCheck size={14} color="var(--mantine-color-blue-6)" style={{ flexShrink: 0 }} />
              )}
              
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                @{author.username}
              </Text>
              
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                · {formatRelativeTime(createdAt)}
              </Text>
            </Box>
          </Box>
        </Box>
        
        {/* ツイート内容 */}
        <Text size="sm" style={{ lineHeight: 1.4 }}>
          {content}
          <br />
          <Text size="xs" c="dimmed" mt="xs">
            ID: {formatTweetId(id)}
          </Text>
        </Text>

        {/* メディア表示 */}
        {media.length > 0 && (
          <Box style={{ marginTop: '8px' }}>
            {(() => {
              switch (media.length) {
                case 1:
                  return (
                    <Paper 
                      withBorder 
                      style={{ 
                        position: 'relative', 
                        overflow: 'hidden', 
                        borderRadius: '16px',
                        backgroundColor: 'transparent',
                        transition: 'background-color 0.2s ease',
                        display: 'inline-block',
                        width: 'fit-content',
                        height: 'fit-content'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <img
                        src={media[0].previewUrl}
                        alt={media[0].altText || 'メディア'}
                        style={{ 
                          width: '100%', 
                          minWidth: '300px', 
                          maxWidth: '516px', 
                          minHeight: '300px', 
                          maxHeight: '417.33px', 
                          objectFit: 'cover',
                          display: 'block'
                        }}
                        onClick={(e) => handleImageClick(e, media[0].url)}
                      />
                      <Badge
                        size="xs"
                        variant="filled"
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          pointerEvents: 'none'
                        }}
                      >
                        {media[0].type.toUpperCase()}
                      </Badge>
                    </Paper>
                  );
                
                case 2:
                  return (
                    <Box 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, 1fr)', 
                        gap: '2px',
                        borderRadius: '16px',
                        position: 'relative',
                        backgroundColor: '#ffffff',
                        transition: 'background-color 0.2s ease',
                        width: 'fit-content',
                        height: 'fit-content'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      {media.map((item, index) => (
                        <Paper
                          key={item.id}
                          withBorder
                          style={{
                            position: 'relative',
                            borderRadius: index === 0 ? '16px 0px 0px 16px' : '0px 16px 16px 0px',
                            overflow: 'hidden',
                            borderRight: index === 0 ? '0 solid black' : 'none',
                            borderLeft: index === 1 ? '0 solid black' : 'none',
                            aspectRatio: '257 / 290.25',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '165.5px',
                            maxWidth: '257px',
                            minHeight: '187.31px',
                            maxHeight: '290.25px'
                          }}
                        >
                          <img
                            src={item.previewUrl}
                            alt={item.altText || 'メディア'}
                            style={{ 
                              width: '100%', 
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                            onClick={(e) => handleImageClick(e, item.url)}
                          />
                          <Badge
                            size="xs"
                            variant="filled"
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              pointerEvents: 'none'
                            }}
                          >
                            {item.type.toUpperCase()}
                          </Badge>
                        </Paper>
                      ))}
                    </Box>
                  );
                
                  case 3:
                    const borderRadiusMap3: Record<number, string> = {
                      0: '16px 0px 0px 16px',
                      1: '0px 16px 0px 0px',
                      2: '0px 0px 16px 0px'
                    }
                  return (
                    <Box 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gridTemplateRows: '1fr 1fr', 
                        gap: '2px', 
                        borderRadius: '16px',
                        position: 'relative',
                        backgroundColor: '#ffffff',
                        transition: 'background-color 0.2s ease',
                        width: 'fit-content',
                        height: 'fit-content'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      {/* 1枚目: 左半分全体 */}
                      <Paper 
                        key={media[0].id} 
                        withBorder 
                        style={{ 
                          position: 'relative',
                          borderRadius: borderRadiusMap3[0],
                          gridColumn: '1',
                          gridRow: '1 / 3',
                          borderRight: '0 solid black',
                          backgroundColor: 'transparent',
                          aspectRatio: '257 / 290.25',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '165.5px',
                          maxWidth: '257px',
                          minHeight: '187.31px',
                          maxHeight: '290.25px'
                        }}
                      >
                        <img
                          src={media[0].previewUrl}
                          alt={media[0].altText || 'メディア'}
                          style={{ 
                            borderRadius: borderRadiusMap3[0],
                            width: '100%', 
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center',
                            display: 'block'
                          }}
                          onClick={(e) => handleImageClick(e, media[0].url)}
                        />
                        <Badge
                          size="xs"
                          variant="filled"
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            pointerEvents: 'none'
                          }}
                        >
                          {media[0].type.toUpperCase()}
                        </Badge>
                      </Paper>
                      
                      {/* 2枚目: 右側上半分 */}
                      <Paper 
                        key={media[1].id} 
                        withBorder 
                        style={{ 
                          position: 'relative',
                          borderRadius: borderRadiusMap3[1],
                          gridColumn: '2',
                          gridRow: '1',
                          borderLeft: '0 solid black',
                          borderBottom: '0 solid black',
                          backgroundColor: 'transparent',
                          aspectRatio: '257 / 144.13',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '165.5px',
                          maxWidth: '257px',
                          minHeight: '92.66px',
                          maxHeight: '144.13px'
                        }}
                      >
                        <img
                          src={media[1].previewUrl}
                          alt={media[1].altText || 'メディア'}
                          style={{ 
                            borderRadius: borderRadiusMap3[1],
                            width: '100%', 
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                          onClick={(e) => handleImageClick(e, media[1].url)}
                        />
                        <Badge
                          size="xs"
                          variant="filled"
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            pointerEvents: 'none'
                          }}
                        >
                          {media[1].type.toUpperCase()}
                        </Badge>
                      </Paper>
                      
                      {/* 3枚目: 右側下半分 */}
                      <Paper 
                        key={media[2].id} 
                        withBorder 
                        style={{ 
                          position: 'relative',
                          borderRadius: borderRadiusMap3[2],
                          gridColumn: '2',
                          gridRow: '2', 
                          borderLeft: '0 solid black',
                          borderTop: '0 solid black',
                          backgroundColor: 'transparent',
                          aspectRatio: '257 / 144.13',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '165.5px',
                          maxWidth: '257px',
                          minHeight: '92.66px',
                          maxHeight: '144.13px'
                        }}
                      >
                        <img
                          src={media[2].previewUrl}
                          alt={media[2].altText || 'メディア'}
                          style={{ 
                            borderRadius: borderRadiusMap3[2],
                            width: '100%', 
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                          onClick={(e) => handleImageClick(e, media[2].url)}
                        />
                        <Badge
                          size="xs"
                          variant="filled"
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            pointerEvents: 'none'
                          }}
                        >
                          {media[2].type.toUpperCase()}
                        </Badge>
                      </Paper>
                    </Box>
                  );
                
                  default: // 4枚以上
                    const borderRadiusMap4: Record<number, string> = {
                      0: '16px 0px 0px 0px',
                      1: '0px 16px 0px 0px',
                      2: '0px 0px 0px 16px',
                      3: '0px 0px 16px 0px'
                    }
                  return (
                    <Box 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, 1fr)', 
                        gap: '2px',
                        borderRadius: '16px',
                        position: 'relative',
                        backgroundColor: '#ffffff',
                        transition: 'background-color 0.2s ease',
                        width: 'fit-content',
                        height: 'fit-content'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      {media.slice(0, 4).map((item, index) => (
                        <Paper 
                          key={item.id} 
                          withBorder 
                          style={{ 
                            position: 'relative',
                            borderRadius: borderRadiusMap4[index%4], 
                            borderRight: (index%4 === 0 || index%4 === 3) ? '0 solid black' : 'none',
                            borderLeft: (index%4 === 1 || index%4 === 2) ? '0 solid black' : 'none',
                            borderTop: (index%4 === 2 || index%4 === 3) ? '0 solid black' : 'none',
                            borderBottom: (index%4 === 0 || index%4 === 1) ? '0 solid black' : 'none',
                            backgroundColor: 'transparent',
                            aspectRatio: '257 / 144.13',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '165.5px',
                            maxWidth: '257px',
                            minHeight: '92.66px',
                            maxHeight: '144.13px'
                          }}
                        >
                          <img
                            src={item.previewUrl}
                            alt={item.altText || 'メディア'}
                            style={{ 
                              borderRadius: borderRadiusMap4[index%4],
                              width: '100%', 
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                            onClick={(e) => handleImageClick(e, item.url)}
                          />
                          <Badge
                            size="xs"
                            variant="filled"
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              pointerEvents: 'none'
                            }}
                          >
                            {item.type.toUpperCase()}
                          </Badge>
                          {index === 3 && media.length > 4 && (
                            <Box
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                                pointerEvents: 'none'
                              }}
                            >
                              <Text size="lg" fw={600} c="white">
                                +{media.length - 4}
                              </Text>
                            </Box>
                          )}
                        </Paper>
                      ))}
                    </Box>
                  );
              }
            })()}
          </Box>
        )}
        
        {/* 統計情報とアクションボタン */}
        <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          {/* 左側のアクションボタン */}
          <Box style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {/* リプライ */}
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <ActionIcon variant="subtle" size="sm" color="gray">
                <IconMessage size={16} />
              </ActionIcon>
              <Text size="xs" c="dimmed">
                {formatCount(stats.replyCount)}
              </Text>
            </Box>
            
            {/* リツイート */}
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <ActionIcon 
                variant="subtle" 
                size="sm" 
                color="gray"
                style={{ color: (stats as any).isRetweeted ? 'rgb(0, 186, 124)' : undefined }}
              >
                <IconRepeat size={16} />
              </ActionIcon>
              <Text 
                size="xs" 
                c={(stats as any).isRetweeted ? 'rgb(0, 186, 124)' : 'dimmed'}
              >
                {formatCount(stats.retweetCount)}
              </Text>
            </Box>
            
            {/* いいね */}
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <ActionIcon 
                variant="subtle" 
                size="sm" 
                color="gray"
                style={{ color: (stats as any).isFavorited ? 'rgb(249, 24, 128)' : undefined }}
              >
                <IconHeart 
                  size={16} 
                  fill={(stats as any).isFavorited ? 'currentColor' : 'none'}
                />
              </ActionIcon>
              <Text 
                size="xs" 
                c={(stats as any).isFavorited ? 'rgb(249, 24, 128)' : 'dimmed'}
              >
                {formatCount(stats.likeCount)}
              </Text>
            </Box>
          </Box>
          
          {/* 右側のシェアボタン */}
          <ActionIcon variant="subtle" size="sm" color="gray" style={{ cursor: 'pointer' }}>
            <IconShare size={16} />
          </ActionIcon>
        </Box>
        
        {/* Storybookバッジ */}
        <Box style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Badge variant="light" size="xs" color="blue">
            Storybook
          </Badge>
        </Box>
      </Box>

      {/* ライトボックス（背景クリックで閉じる） */}
      {lightboxSrc && (
        <Box
          onClick={handleCloseLightbox}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: lightboxStage === 'entered' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0)',
            transition: 'background-color 200ms ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
        >
          {/* クローズボタン（左上、36pxマージン） */}
          <ActionIcon
            onClick={(e) => { e.stopPropagation(); startCloseLightbox(); }}
            variant="subtle"
            color="gray"
            size="lg"
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              color: '#ffffff',
              width: 38,
              height: 38,
              borderRadius: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10002,
            }}
            aria-label="閉じる"
          >
            <IconX size={24} />
          </ActionIcon>
          {/* 画像の拡大/縮小アニメーション用ラッパー */}
          <Box
            style={{
              transformOrigin: `${lightboxOrigin.x}px ${lightboxOrigin.y}px`,
              transform: lightboxStage === 'entered' ? 'scale(1)' : 'scale(0.85)',
              opacity: lightboxStage === 'entered' ? 1 : 0,
              transition: 'transform 200ms ease, opacity 200ms ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={lightboxSrc}
              alt="preview"
              style={{
                height: '100vh',
                width: 'auto',
                maxWidth: '100vw',
                objectFit: 'contain',
                zIndex: 10001
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </Box>
        </Box>
      )}
    </Paper>
  );
}
