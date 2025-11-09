import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Alert,
  Menu,
  Transition,
  Button,
  Checkbox,
  ScrollArea,
  Divider
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
  IconAlertCircle,
  IconDots,
  IconEdit,
  IconTrash,
  IconLink
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
import { useCbStore } from '../state/cbStore';
import { cbService } from '../services/cbService';
import { Cb } from '../types/cb';
import { showNotification } from '@mantine/notifications';

/**
 * 本番用ツイート表示コンポーネント
 * Localデータベースから取得したツイート情報を表示
 */
interface TweetProps {
  id: string;
  /** 削除後に呼び出されるコールバック関数 */
  onDelete?: () => void;
}

export function Tweet({ id, onDelete }: TweetProps) {
  const { selectedCbId } = useCbStore();
  const [author, setAuthor] = useState<TweetAuthor | null>(null);
  const [stats, setStats] = useState<TweetStats | null>(null);
  const [content, setContent] = useState<string>('');
  const [media, setMedia] = useState<TweetMediaItem[]>([]);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useEmbedTweet, setUseEmbedTweet] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCbMenuOpen, setIsCbMenuOpen] = useState(false);
  const [cbs, setCbs] = useState<Cb[]>([]);
  const [selectedCbIds, setSelectedCbIds] = useState<Set<string>>(new Set());
  const [initialCbIds, setInitialCbIds] = useState<Set<string>>(new Set());
  const [isLoadingCbs, setIsLoadingCbs] = useState(false);
  const [isSavingCbs, setIsSavingCbs] = useState(false);

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

  // 削除処理
  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCbId) {
      showNotification({
        title: 'エラー',
        message: 'CBが選択されていません',
        color: 'red',
      });
      return;
    }

    setIsDeleting(true);
    try {
      await cbService.removeTweetFromCb(selectedCbId, id);
      setIsDeleteModalOpen(false);
      // 親コンポーネントのrefetchを呼び出してタイムラインを更新
      onDelete?.();
      showNotification({
        title: '成功',
        message: 'ツイートを削除しました',
        color: 'rgb(29, 155, 240)',
      });
    } catch (error) {
      console.error('ツイート削除エラー:', error);
      showNotification({
        title: 'エラー',
        message: 'ツイートの削除に失敗しました',
        color: 'red',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
  };

  // CB一覧を取得して、既に登録されているCBをチェック
  useEffect(() => {
    if (!isCbMenuOpen) return;

    const fetchCbs = async () => {
      setIsLoadingCbs(true);
      try {
        const allCbs = await cbService.listCbs();
        setCbs(allCbs);

        // 各CBに対して、現在のツイートが既に登録されているかチェック
        const selected = new Set<string>();
        for (const cb of allCbs) {
          try {
            const tweetIds = await cbService.getTweetIdsByCbId(cb.id);
            if (tweetIds.includes(id)) {
              selected.add(cb.id);
            }
          } catch (error) {
            console.error(`CB ${cb.id} のツイートID取得エラー:`, error);
          }
        }
        // 初期状態を保存（コピーを作成）
        setInitialCbIds(new Set(selected));
        // 選択状態を初期状態にリセット
        setSelectedCbIds(new Set(selected));
      } catch (error) {
        console.error('CB一覧取得エラー:', error);
      } finally {
        setIsLoadingCbs(false);
      }
    };

    fetchCbs();
  }, [isCbMenuOpen, id]);

  // 編集処理（CBに追加）
  const handleEdit = () => {
    setIsCbMenuOpen(prev => !prev);
  };

  // CB選択のトグル
  const handleCbToggle = (cbId: string) => {
    setSelectedCbIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cbId)) {
        newSet.delete(cbId);
      } else {
        newSet.add(cbId);
      }
      return newSet;
    });
  };

  // CBに保存
  const handleSaveCbs = async () => {
    if (!author) {
      showNotification({
        title: 'エラー',
        message: 'ユーザー情報が取得できませんでした',
        color: 'red',
      });
      return;
    }

    setIsSavingCbs(true);
    try {
      // ツイートデータを準備
      const tweetData = {
        authorUsername: author.username,
        authorDisplayName: author.displayName,
        authorId: author.id,
        content: content,
        mediaUrls: media.map(m => m.url),
        mediaTypes: media.map(m => m.type),
        tweetDate: createdAt?.toISOString() || new Date().toISOString(),
        isRetweet: false,
        isReply: false,
      };

      // 初期状態と現在の選択状態を比較して差分を計算
      const toRemove = new Set<string>(); // 削除するCB（初期にはあったが現在はない）
      const toAdd = new Set<string>(); // 追加するCB（初期にはなかったが現在はある）

      // 初期状態にはあったが、現在の選択状態にはないCBを削除リストに追加
      for (const cbId of initialCbIds) {
        if (!selectedCbIds.has(cbId)) {
          toRemove.add(cbId);
        }
      }

      // 初期状態にはなかったが、現在の選択状態にはあるCBを追加リストに追加
      for (const cbId of selectedCbIds) {
        if (!initialCbIds.has(cbId)) {
          toAdd.add(cbId);
        }
      }

      // 削除処理
      for (const cbId of toRemove) {
        try {
          await cbService.removeTweetFromCb(cbId, id);
        } catch (error) {
          console.error(`CB ${cbId} からの削除エラー:`, error);
        }
      }

      // 追加処理
      for (const cbId of toAdd) {
        try {
          await cbService.addTweetToCb(cbId, id, tweetData);
        } catch (error) {
          console.error(`CB ${cbId} への追加エラー:`, error);
        }
      }

      // 初期状態を更新（現在の選択状態を新しい初期状態として保存）
      setInitialCbIds(new Set(selectedCbIds));

      // メニューを閉じる
      setIsCbMenuOpen(false);
      setIsMenuOpen(false);
      
      // 成功メッセージ
      const actionMessages: string[] = [];
      if (toRemove.size > 0) {
        actionMessages.push(`${toRemove.size}個のCBから削除`);
      }
      if (toAdd.size > 0) {
        actionMessages.push(`${toAdd.size}個のCBに追加`);
      }
      
      if (actionMessages.length > 0) {
        showNotification({
          title: '成功',
          message: actionMessages.join('、'),
          color: 'rgb(29, 155, 240)',
        });
      }
    } catch (error) {
      console.error('CBの更新エラー:', error);
      showNotification({
        title: 'エラー',
        message: 'CBの更新に失敗しました',
        color: 'red',
      });
    } finally {
      setIsSavingCbs(false);
    }
  };

  // リンクをコピー
  const handleCopyLink = async () => {
    if (!author) {
      showNotification({
        title: 'エラー',
        message: 'ユーザー情報が取得できませんでした',
        color: 'red',
      });
      return;
    }

    try {
      const url = `https://x.com/${author.username}/status/${id}`;
      await navigator.clipboard.writeText(url);
      showNotification({
        title: '成功',
        message: 'リンクをコピーしました',
        color: 'rgb(29, 155, 240)',
      });
    } catch (error) {
      console.error('リンクのコピーに失敗しました:', error);
      showNotification({
        title: 'エラー',
        message: 'リンクのコピーに失敗しました',
        color: 'red',
      });
    }
  };

  // ツイートのURLを新しいタブで開く
  const handleTweetClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // ライトボックスが開いている場合は処理しない
    if (lightboxSrc !== null) {
      return;
    }

    // インタラクティブな要素（ボタン、リンク、メニュー、画像など）をクリックした場合は処理しない
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="menu"]') ||
      target.closest('[role="menuitem"]') ||
      target.closest('[data-mantine-menu-item]') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('img') ||
      target.closest('video')
    ) {
      return;
    }

    if (!author) {
      return;
    }

    const url = `https://x.com/${author.username}/status/${id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 投稿者のプロフィールページを新しいタブで開く
  const handleAuthorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation(); // 親要素のクリックイベントを防ぐ
    
    if (!author) {
      return;
    }

    const url = `https://x.com/${author.username}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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
        transition: 'background-color 0.2s ease',
        cursor: 'pointer'
      }}
      onClick={handleTweetClick}
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
          <Box
            style={{
              position: 'relative',
              flexShrink: 0,
              cursor: 'pointer'
            }}
            onClick={handleAuthorClick}
            onMouseEnter={(e) => {
              const overlay = e.currentTarget.querySelector('[data-avatar-overlay]') as HTMLElement;
              if (overlay) {
                overlay.style.backgroundColor = 'rgba(26, 26, 26, 0.03)';
              }
            }}
            onMouseLeave={(e) => {
              const overlay = e.currentTarget.querySelector('[data-avatar-overlay]') as HTMLElement;
              if (overlay) {
                overlay.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Avatar
              src={author.profileImageUrl || undefined}
              alt={author.displayName}
              size="md"
              radius="xl"
              color="rgb(29, 155, 240)"
            >
              {!author.profileImageUrl && <IconUser size={20} />}
            </Avatar>
            <Box
              data-avatar-overlay
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: '50%',
                backgroundColor: 'transparent',
                transition: 'background-color 0.2s ease',
                pointerEvents: 'none'
              }}
            />
          </Box>
          
          {/* ユーザー情報 */}
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
            {/* ユーザー名、認証マーク、ユーザーID、時刻を横並び */}
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <Text size="15px" fw={600} style={{ whiteSpace: 'nowrap' }} onClick={handleAuthorClick}>
                {author.displayName}
              </Text>
              
              {author.verified && (
                <IconCheck size={15} color="var(--mantine-color-blue-6)" style={{ flexShrink: 0 }} />
              )}
              
              <Text size="15px" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                @{author.username}
              </Text>
              
              <Text size="15px" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                · {formatRelativeTime(createdAt)}
              </Text>
            </Box>
          </Box>

          {/* ツイートの編集ボタン */}
          <Transition mounted={true} transition="fade" duration={150}>
                {(menuStyles) => (
                  <Menu 
                    shadow="md" 
                    width={isCbMenuOpen ? 320 : 150} 
                    position="bottom-end" 
                    styles={{ dropdown: { borderRadius: '12px', backgroundColor: 'white' } }}
                    opened={isMenuOpen}
                    onClose={() => {
                      setIsMenuOpen(false);
                      setIsCbMenuOpen(false);
                      // メニューを閉じた時に選択状態を初期状態にリセット
                      setSelectedCbIds(new Set(initialCbIds));
                    }}
                  >
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        size="lg"
                        radius="xl"
                        style={menuStyles}
                        onClick={() => setIsMenuOpen(true)}
                      >
                        <IconDots size={18.75} color="var(--mantine-color-gray-6)" />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconEdit size={18.75} />}
                        onClick={handleEdit}
                        closeMenuOnClick={false}
                        style={{ fontSize: '15px', fontWeight: '600'}}
                      >
                        CBに追加
                      </Menu.Item>
                      {isCbMenuOpen && (
                        <Menu.Item
                          component="div"
                          style={{ padding: 0 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Box style={{ width: '100%', maxWidth: 300 }} onClick={(e) => e.stopPropagation()}>
                            <Box p="xs" style={{ borderBottom: '1px solid #e1e8ed' }}>
                              <Text size="sm" fw={600} style={{ padding: '8px 12px', fontSize: '15px'}}>
                                CBを選択
                              </Text>
                            </Box>
                            <ScrollArea h={200} type="scroll">
                              {isLoadingCbs ? (
                                <Box p="md" style={{ display: 'flex', justifyContent: 'center' }}>
                                  <Loader size="sm" />
                                </Box>
                              ) : cbs.length === 0 ? (
                                <Box p="md">
                                  <Text size="sm" c="dimmed" ta="center" style={{ fontSize: '15px' }}>
                                    CBがありません
                                  </Text>
                                </Box>
                              ) : (
                                <Stack gap={0} p="xs">
                                  {cbs.map(cb => (
                                    <Box
                                      key={cb.id}
                                      p="xs"
                                      style={{
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        transition: 'background-color 0.2s',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                      }}
                                      onClick={() => handleCbToggle(cb.id)}
                                    >
                                      <Group gap="xs" align="center" wrap="nowrap"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCbToggle(cb.id);
                                        }}
                                      >
                                        <Checkbox
                                          checked={selectedCbIds.has(cb.id)}
                                          onChange={() => handleCbToggle(cb.id)}
                                          onClick={(e) => e.stopPropagation()}
                                          size="sm"
                                          color="rgb(29, 155, 240)"
                                        />
                                        <Box style={{ flex: 1, minWidth: 0 }}>
                                          <Text size="sm" fw={500} truncate>
                                            {cb.name}
                                          </Text>
                                          {cb.description && (
                                            <Text size="xs" c="dimmed" truncate>
                                              {cb.description}
                                            </Text>
                                          )}
                                        </Box>
                                        <Badge size="xs" variant="light" color="rgb(29, 155, 240)">
                                          {cb.tweetCount}
                                        </Badge>
                                      </Group>
                                    </Box>
                                  ))}
                                </Stack>
                              )}
                            </ScrollArea>
                            <Divider />
                            <Box p="xs" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <Button
                                size="xs"
                                variant="subtle"
                                color="rgb(29, 155, 240)"
                                radius="lg"
                                style={{ fontSize: '15px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsCbMenuOpen(false);
                                }}
                                disabled={isSavingCbs}
                              >
                                キャンセル
                              </Button>
                              <Button
                                size="xs"
                                radius="lg"
                                color="rgb(29, 155, 240)"
                                style={{ fontSize: '15px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveCbs();
                                }}
                                loading={isSavingCbs}
                                disabled={selectedCbIds.size === 0}
                              >
                                保存
                              </Button>
                            </Box>
                          </Box>
                        </Menu.Item>
                      )}
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconTrash size={18.75} />}
                        color="red"
                        onClick={handleDelete}
                        style={{ fontSize: '15px', fontWeight: '600'}}
                      >
                        削除
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                )}
              </Transition>
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
                          display: 'block',
                          cursor: 'pointer'
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
                              display: 'block',
                              cursor: 'pointer'
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
                            display: 'block',
                            cursor: 'pointer'
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
                            display: 'block',
                            cursor: 'pointer'
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
                            display: 'block',
                            cursor: 'pointer'
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
                              display: 'block',
                              cursor: 'pointer'
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
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'cursor' }}>
              <ActionIcon variant="subtle" size="lg" color="gray" radius="xl">
                <IconMessage size={16} />
              </ActionIcon>
              <Text size="xs" c="dimmed">
                {formatCount(stats.replyCount)}
              </Text>
            </Box>
            
            {/* リツイート */}
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'cursor' }}>
              <ActionIcon variant="subtle" size="lg" color="gray" radius="xl">
                <IconRepeat size={18.75} />
              </ActionIcon>
              <Text size="xs" c="dimmed">
                {formatCount(stats.retweetCount)}
              </Text>
            </Box>
            
            {/* いいね */}
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'cursor' }}>
              <ActionIcon variant="subtle" size="lg" color="gray" radius="xl">
                <IconHeart size={18.75} />
              </ActionIcon>
              <Text size="xs" c="dimmed">
                {formatCount(stats.likeCount)}
              </Text>
            </Box>
          </Box>
          
          {/* 右側のシェアボタン */}
          <Transition mounted={true} transition="fade" duration={150}>
                {(menuStyles) => (
                  <Menu shadow="md" width={175} position="bottom-end" styles={{ dropdown: { borderRadius: '12px', backgroundColor: 'white' } }}>
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        size="lg"
                        radius="xl"
                        style={menuStyles}
                      >
                        <IconShare size={18.75} color="var(--mantine-color-gray-6)" />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconLink size={18.75} stroke={2.0}/>}
                        onClick={handleCopyLink}
                        style={{ fontSize: '15px', fontWeight: '600'}}
                      >
                        リンクをコピー
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                )}
              </Transition>
        </Box>
      </Box>

      {/* ライトボックス（背景クリックで閉じる） - Portalでbody直下にレンダリング */}
      {lightboxSrc && currentImageIndex !== null && typeof document !== 'undefined' && createPortal(
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
        </Box>,
        document.body as Element
      )}

      {/* 削除確認モーダル */}
      {isDeleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCancelDelete}
        >
          <Box
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '320px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Text
              size="xl"
              fw={700}
              style={{
                color: 'black',
                marginBottom: '8px',
              }}
            >
              ツイートを削除しますか？
            </Text>
            <Text
              style={{
                color: 'rgb(83, 100, 113)',
                marginBottom: '24px',
                fontSize: '15px',
              }}
            >
              この操作は取り消せません
            </Text>
            <Stack gap="xs">
              <Button
                color="rgb(244, 33, 46)"
                size="lg"
                radius="xl"
                fullWidth
                onClick={handleConfirmDelete}
                loading={isDeleting}
                style={{
                  borderColor: 'rgb(207, 217, 222)',
                }}
              >
                削除
              </Button>
              <Button
                variant="default"
                size="lg"
                radius="xl"
                fullWidth
                onClick={handleCancelDelete}
                disabled={isDeleting}
                style={{
                  backgroundColor: 'white',
                  color: 'black',
                  borderColor: 'rgb(207, 217, 222)',
                }}
              >
                キャンセル
              </Button>
            </Stack>
          </Box>
        </div>
      )}
    </Paper>
  );
}

