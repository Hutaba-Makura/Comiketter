import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Stack, 
  Text, 
  Group, 
  Badge, 
  Box, 
  Avatar, 
  ActionIcon,
  Loader,
  Alert
} from '@mantine/core';
import { 
  IconHeart, 
  IconRepeat, 
  IconMessage, 
  IconShare, 
  IconUser, 
  IconCheck, 
  IconX, 
  IconChevronLeft, 
  IconChevronRight,
  IconAlertCircle
} from '@tabler/icons-react';
import { bookmarkDB } from '../../utils/bookmarkDB';
import { 
  convertBookmarkedTweetToUITweet,
  isBookmarkedTweetComplete 
} from '../utils/tweet-converter';
import { formatTweetId, formatRelativeTime, formatCount } from '../utils/format';
import { TweetAuthor, TweetStats, TweetMediaItem } from '../types/tweet';
import { TweetEmbedFallback } from './TweetEmbedFallback';
import { TweetEmbed } from './TweetEmbed';

/**
 * 本番用ツイート表示コンポーネント
 * Localデータベースから取得したツイート情報を表示
 */
interface TweetProps {
  id: string;
}

export function Tweet({ id }: TweetProps) {
  const [author, setAuthor] = useState<TweetAuthor | null>(null);
  const [stats, setStats] = useState<TweetStats | null>(null);
  const [content, setContent] = useState<string>('');
  const [media, setMedia] = useState<TweetMediaItem[]>([]);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useEmbedTweet, setUseEmbedTweet] = useState(false);

  // BookmarkDBからツイート情報を取得
  useEffect(() => {
    let cancelled = false;

    async function fetchTweet() {
      try {
        setLoading(true);
        setError(null);
        setUseEmbedTweet(false);

        // BookmarkDBからツイートを取得
        const bookmarkedTweets = await bookmarkDB.getBookmarkedTweetByTweetId(id);
        
        if (cancelled) return;

        if (!bookmarkedTweets || bookmarkedTweets.length === 0) {
          // BookmarkDBにデータがない場合は、TweetEmbedを表示
          console.log(`Comiketter: ツイートが見つかりませんでした (BookmarkDB) - ${id}`);
          setUseEmbedTweet(true);
          setLoading(false);
          return;
        }

        // 最初のブックマーク済みツイートを使用（同じツイートが複数のブックマークに登録されている可能性があるため）
        const bookmarkedTweet = bookmarkedTweets[0];

        // データが不完全かどうかを判定
        // if (!isBookmarkedTweetComplete(bookmarkedTweet)) {
        //   // 不完全なデータの場合は、TweetEmbedを表示
        //   console.log(`Comiketter: 不完全なデータのためTweetEmbedを表示 - ${id}`);
        //   setUseEmbedTweet(true);
        //   setLoading(false);
        //   return;
        // }

        // BookmarkedTweetDBをUI用の型に変換
        const uiTweet = convertBookmarkedTweetToUITweet(bookmarkedTweet);
        
        setAuthor(uiTweet.author);
        setStats(uiTweet.stats);
        setContent(uiTweet.content);
        setMedia(uiTweet.media);
        setCreatedAt(uiTweet.createdAt);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Comiketter: ツイート取得エラー:', err);
        
        // エラーの場合は、TweetEmbedを表示
        setUseEmbedTweet(true);
        setLoading(false);
      }
    }

    fetchTweet();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // 画像ライトボックス用の状態
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
  const [lightboxOrigin, setLightboxOrigin] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [lightboxStage, setLightboxStage] = useState<'enter' | 'entered' | 'exit' | null>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>, src: string, index: number) => {
    setLightboxOrigin({ x: e.clientX, y: e.clientY });
    setLightboxSrc(src);
    setCurrentImageIndex(index);
    setLightboxStage('enter');
    // 次フレームでenteredにしてトランジションを発火
    requestAnimationFrame(() => setLightboxStage('entered'));
  };

  // 前の画像に切り替え
  const handlePreviousImage = () => {
    if (currentImageIndex === null || currentImageIndex <= 0) return;
    const prevIndex = currentImageIndex - 1;
    setLightboxSrc(media[prevIndex].url);
    setCurrentImageIndex(prevIndex);
    // アニメーションのため一旦リセットして再開
    setLightboxStage('enter');
    setLightboxOrigin({ x: window.innerWidth / 4, y: window.innerHeight / 2 });
    requestAnimationFrame(() => setLightboxStage('entered'));
  };

  // 次の画像に切り替え
  const handleNextImage = () => {
    if (currentImageIndex === null || currentImageIndex >= media.length - 1) return;
    const nextIndex = currentImageIndex + 1;
    setLightboxSrc(media[nextIndex].url);
    setCurrentImageIndex(nextIndex);
    // アニメーションのため一旦リセットして再開
    setLightboxStage('enter');
    setLightboxOrigin({ x: (window.innerWidth / 4) * 3, y: window.innerHeight / 2 });
    requestAnimationFrame(() => setLightboxStage('entered'));
  };

  const startCloseLightbox = () => {
    setLightboxStage('exit');
    window.setTimeout(() => {
      setLightboxSrc(null);
      setCurrentImageIndex(null);
      setLightboxStage(null);
    }, 200);
  };

  const handleCloseLightbox = () => startCloseLightbox();

  // ビデオ/GIF再生時のデバッグログ
  useEffect(() => {
    if (lightboxSrc && currentImageIndex !== null && media[currentImageIndex]) {
      const currentMedia = media[currentImageIndex];
      if (currentMedia.type === 'video' || currentMedia.type === 'gif') {
        console.log(
          `Comiketter: ${currentMedia.type === 'gif' ? 'GIF' : 'ビデオ'}を再生します`,
          {
            type: currentMedia.type,
            url: lightboxSrc,
            previewUrl: currentMedia.previewUrl,
            index: currentImageIndex,
            mediaId: currentMedia.id
          }
        );
      }
    }
  }, [lightboxSrc, currentImageIndex, media]);

  // キーボードイベントリスナー（ライトボックスが開いている時のみ）
  useEffect(() => {
    if (!lightboxSrc || currentImageIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        // 前の画像に切り替え
        if (currentImageIndex !== null && currentImageIndex > 0) {
          const prevIndex = currentImageIndex - 1;
          setLightboxSrc(media[prevIndex].url);
          setCurrentImageIndex(prevIndex);
          setLightboxStage('enter');
          setLightboxOrigin({ x: window.innerWidth / 4, y: window.innerHeight / 2 });
          requestAnimationFrame(() => setLightboxStage('entered'));
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        // 次の画像に切り替え
        if (currentImageIndex !== null && currentImageIndex < media.length - 1) {
          const nextIndex = currentImageIndex + 1;
          setLightboxSrc(media[nextIndex].url);
          setCurrentImageIndex(nextIndex);
          setLightboxStage('enter');
          setLightboxOrigin({ x: (window.innerWidth / 4) * 3, y: window.innerHeight / 2 });
          requestAnimationFrame(() => setLightboxStage('entered'));
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        startCloseLightbox();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxSrc, currentImageIndex, media]);

  // ローディング状態
  if (loading) {
    return (
      <Paper 
        p="md" 
        withBorder 
        style={{ 
          maxWidth: '598px',
          margin: '0 auto',
          backgroundColor: '#ffffff'
        }}
      >
        <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <Loader size="sm" />
          <Text size="sm" c="dimmed" ml="md">
            読み込み中...
          </Text>
        </Box>
      </Paper>
    );
  }

  // データが不完全な場合、またはエラーの場合はTweetEmbedを表示
  if (useEmbedTweet || error || !author || !stats || !createdAt) {
    if (useEmbedTweet || (!author && !stats && !createdAt)) {
      // TweetEmbedを表示
      return (
        <Box style={{ maxWidth: '598px', margin: '0 auto' }}>
          <TweetEmbed id={id} />
        </Box>
      );
    }
    
    // その他のエラーの場合は、TweetEmbedFallbackを表示
    return (
      <Box style={{ maxWidth: '598px', margin: '0 auto' }}>
        <TweetEmbedFallback 
          id={id}
          onRetry={() => {
            setLoading(true);
            setError(null);
            setUseEmbedTweet(false);
            // 再取得をトリガー
            const fetchTweet = async () => {
              try {
                const bookmarkedTweets = await bookmarkDB.getBookmarkedTweetByTweetId(id);
                if (bookmarkedTweets && bookmarkedTweets.length > 0) {
                  const bookmarkedTweet = bookmarkedTweets[0];
                  if (isBookmarkedTweetComplete(bookmarkedTweet)) {
                    const uiTweet = convertBookmarkedTweetToUITweet(bookmarkedTweet);
                    setAuthor(uiTweet.author);
                    setStats(uiTweet.stats);
                    setContent(uiTweet.content);
                    setMedia(uiTweet.media);
                    setCreatedAt(uiTweet.createdAt);
                    setLoading(false);
                  } else {
                    setUseEmbedTweet(true);
                    setLoading(false);
                  }
                } else {
                  setUseEmbedTweet(true);
                  setLoading(false);
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : 'ツイートの取得に失敗しました');
                setUseEmbedTweet(true);
                setLoading(false);
              }
            };
            fetchTweet();
          }}
        />
      </Box>
    );
  }

  return (
    <Paper 
      p="md" 
      withBorder 
      style={{ 
        maxWidth: '598px',
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
                        onClick={(e) => handleImageClick(e, media[0].url, 0)}
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
                            onClick={(e) => handleImageClick(e, item.url, index)}
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
                  };
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
                          onClick={(e) => handleImageClick(e, media[0].url, 0)}
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
                          onClick={(e) => handleImageClick(e, media[1].url, 1)}
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
                          onClick={(e) => handleImageClick(e, media[2].url, 2)}
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
                  };
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
                            borderRadius: borderRadiusMap4[index % 4], 
                            borderRight: (index % 4 === 0 || index % 4 === 3) ? '0 solid black' : 'none',
                            borderLeft: (index % 4 === 1 || index % 4 === 2) ? '0 solid black' : 'none',
                            borderTop: (index % 4 === 2 || index % 4 === 3) ? '0 solid black' : 'none',
                            borderBottom: (index % 4 === 0 || index % 4 === 1) ? '0 solid black' : 'none',
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
                              borderRadius: borderRadiusMap4[index % 4],
                              width: '100%', 
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                            onClick={(e) => handleImageClick(e, item.url, index)}
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
              <ActionIcon variant="subtle" size="sm" color="gray">
                <IconRepeat size={16} />
              </ActionIcon>
              <Text size="xs" c="dimmed">
                {formatCount(stats.retweetCount)}
              </Text>
            </Box>
            
            {/* いいね */}
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <ActionIcon variant="subtle" size="sm" color="gray">
                <IconHeart size={16} />
              </ActionIcon>
              <Text size="xs" c="dimmed">
                {formatCount(stats.likeCount)}
              </Text>
            </Box>
          </Box>
          
          {/* 右側のシェアボタン */}
          <ActionIcon variant="subtle" size="sm" color="gray" style={{ cursor: 'pointer' }}>
            <IconShare size={16} />
          </ActionIcon>
        </Box>
      </Box>

      {/* ライトボックス（背景クリックで閉じる） */}
      {lightboxSrc && currentImageIndex !== null && (
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
          {/* クローズボタン（左上） */}
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
          {/* 前の画像ボタン（左側中央、隣接画像がある場合のみ表示） */}
          {currentImageIndex > 0 && (
            <ActionIcon
              onClick={(e) => {
                e.stopPropagation();
                handlePreviousImage();
              }}
              variant="subtle"
              color="gray"
              size="lg"
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
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
                zIndex: 10002
              }}
              aria-label="前の画像"
            >
              <IconChevronLeft size={24} />
            </ActionIcon>
          )}
          {/* 次の画像ボタン（右側中央、隣接画像がある場合のみ表示） */}
          {currentImageIndex < media.length - 1 && (
            <ActionIcon
              onClick={(e) => {
                e.stopPropagation();
                handleNextImage();
              }}
              variant="subtle"
              color="gray"
              size="lg"
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
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
                zIndex: 10002
              }}
              aria-label="次の画像"
            >
              <IconChevronRight size={24} />
            </ActionIcon>
          )}
          {/* メディアの拡大/縮小アニメーション用ラッパー */}
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
            {media[currentImageIndex] && (media[currentImageIndex].type === 'video' || media[currentImageIndex].type === 'gif') ? (
              <video
                src={lightboxSrc || undefined}
                autoPlay
                loop={media[currentImageIndex].type === 'gif'}
                controls
                style={{
                  height: '100vh',
                  width: 'auto',
                  maxWidth: '100vw',
                  objectFit: 'contain',
                  zIndex: 10001
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={lightboxSrc || undefined}
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
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
}

