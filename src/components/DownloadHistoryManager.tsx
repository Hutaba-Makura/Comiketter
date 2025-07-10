/**
 * DL履歴管理コンポーネント
 * IndexedDBベースのダウンロード履歴を表示・管理
 */

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Text, 
  Group, 
  Badge, 
  ActionIcon, 
  Modal, 
  TextInput, 
  Select,
  Stack,
  Card,
  Grid,
  Pagination
} from '@mantine/core';
import { IconTrash, IconSearch, IconFilter, IconDownload } from '@tabler/icons-react';
import { DownloadHistory, DownloadHistoryStats } from '../types';

interface DownloadHistoryManagerProps {
  onClose?: () => void;
}

export const DownloadHistoryManager: React.FC<DownloadHistoryManagerProps> = ({ onClose }) => {
  const [histories, setHistories] = useState<DownloadHistory[]>([]);
  const [stats, setStats] = useState<DownloadHistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<DownloadHistory | null>(null);

  // 初期データ読み込み
  useEffect(() => {
    loadData();
  }, []);

  // データ読み込み
  const loadData = async () => {
    try {
      setLoading(true);
      
      // 履歴と統計を並行して取得
      const [historyData, statsData] = await Promise.all([
        chrome.runtime.sendMessage({ type: 'GET_DOWNLOAD_HISTORY' }),
        chrome.runtime.sendMessage({ type: 'GET_DOWNLOAD_HISTORY_STATS' })
      ]);

      if (historyData.success) {
        setHistories(historyData.data);
      }

      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Failed to load download history:', error);
    } finally {
      setLoading(false);
    }
  };

  // フィルタリングされたデータを取得
  const getFilteredData = () => {
    let filtered = histories;

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(history => 
        history.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        history.authorUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
        history.tweetContent?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // ステータスフィルター
    if (statusFilter !== 'all') {
      filtered = filtered.filter(history => history.status === statusFilter);
    }

    // ダウンロード方法フィルター
    if (methodFilter !== 'all') {
      filtered = filtered.filter(history => history.downloadMethod === methodFilter);
    }

    // 日付フィルター
    if (startDate) {
      filtered = filtered.filter(history => 
        new Date(history.downloadedAt) >= startDate
      );
    }

    if (endDate) {
      filtered = filtered.filter(history => 
        new Date(history.downloadedAt) <= endDate
      );
    }

    return filtered;
  };

  // ページネーション
  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 履歴削除
  const handleDeleteHistory = async (history: DownloadHistory) => {
    setSelectedHistory(history);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedHistory) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_DOWNLOAD_HISTORY',
        payload: { id: selectedHistory.id }
      });

      if (response.success) {
        setHistories(histories.filter(h => h.id !== selectedHistory.id));
        setDeleteModalOpen(false);
        setSelectedHistory(null);
        await loadData(); // 統計を更新
      }
    } catch (error) {
      console.error('Failed to delete download history:', error);
    }
  };

  // 全履歴クリア
  const handleClearAll = async () => {
    if (!confirm('すべてのダウンロード履歴を削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CLEAR_DOWNLOAD_HISTORY'
      });

      if (response.success) {
        setHistories([]);
        setStats({
          total: 0,
          success: 0,
          failed: 0,
          pending: 0,
          totalSize: 0
        });
      }
    } catch (error) {
      console.error('Failed to clear download history:', error);
    }
  };

  // ファイルサイズを人間が読みやすい形式に変換
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '不明';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // ステータスバッジの色を取得
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'green';
      case 'failed': return 'red';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Text>ダウンロード履歴を読み込み中...</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* 統計カード */}
      {stats && (
        <Grid mb="md">
          <Grid.Col span={3}>
            <Card shadow="sm" padding="lg">
              <Text size="lg" fw={500}>総ダウンロード数</Text>
              <Text size="xl" fw={700} c="blue">{stats.total}</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={3}>
            <Card shadow="sm" padding="lg">
              <Text size="lg" fw={500}>成功</Text>
              <Text size="xl" fw={700} c="green">{stats.success}</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={3}>
            <Card shadow="sm" padding="lg">
              <Text size="lg" fw={500}>失敗</Text>
              <Text size="xl" fw={700} c="red">{stats.failed}</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={3}>
            <Card shadow="sm" padding="lg">
              <Text size="lg" fw={500}>合計サイズ</Text>
              <Text size="xl" fw={700} c="blue">{formatFileSize(stats.totalSize)}</Text>
            </Card>
          </Grid.Col>
        </Grid>
      )}

      {/* フィルター */}
      <Card shadow="sm" mb="md">
        <Stack>
          <Group>
            <TextInput
              placeholder="ファイル名、ユーザー名、ツイート内容で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="ステータス"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || 'all')}
              data={[
                { value: 'all', label: 'すべて' },
                { value: 'success', label: '成功' },
                { value: 'failed', label: '失敗' },
                { value: 'pending', label: '処理中' }
              ]}
            />
            <Select
              placeholder="ダウンロード方法"
              value={methodFilter}
              onChange={(value) => setMethodFilter(value || 'all')}
              data={[
                { value: 'all', label: 'すべて' },
                { value: 'chrome_downloads', label: 'Chrome Downloads' },
                { value: 'native_messaging', label: 'Native Messaging' }
              ]}
            />
          </Group>
          <Group>
            <TextInput
              placeholder="開始日 (YYYY-MM-DD)"
              value={startDate ? startDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
              style={{ width: '150px' }}
            />
            <TextInput
              placeholder="終了日 (YYYY-MM-DD)"
              value={endDate ? endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
              style={{ width: '150px' }}
            />
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setMethodFilter('all');
                setStartDate(null);
                setEndDate(null);
              }}
            >
              フィルタークリア
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* 操作ボタン */}
      <Group mb="md" justify="space-between">
        <Text size="lg" fw={500}>
          ダウンロード履歴 ({filteredData.length}件)
        </Text>
        <Group>
          <Button
            variant="outline"
            color="red"
            onClick={handleClearAll}
            leftSection={<IconTrash size={16} />}
          >
            全履歴クリア
          </Button>
          <Button
            variant="outline"
            onClick={loadData}
            leftSection={<IconDownload size={16} />}
          >
            更新
          </Button>
        </Group>
      </Group>

      {/* 履歴テーブル */}
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>ファイル名</Table.Th>
            <Table.Th>ユーザー</Table.Th>
            <Table.Th>ステータス</Table.Th>
            <Table.Th>サイズ</Table.Th>
            <Table.Th>ダウンロード日時</Table.Th>
            <Table.Th>操作</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {paginatedData.map((history) => (
            <Table.Tr key={history.id}>
              <Table.Td>
                <Text size="sm" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {history.filename}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{history.authorUsername}</Text>
              </Table.Td>
              <Table.Td>
                <Badge color={getStatusColor(history.status)}>
                  {history.status === 'success' ? '成功' : 
                   history.status === 'failed' ? '失敗' : '処理中'}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{formatFileSize(history.fileSize)}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">
                  {new Date(history.downloadedAt).toLocaleString('ja-JP')}
                </Text>
              </Table.Td>
              <Table.Td>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => handleDeleteHistory(history)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {/* ページネーション */}
      {totalPages > 1 && (
        <Group justify="center" mt="md">
          <Pagination
            total={totalPages}
            value={currentPage}
            onChange={setCurrentPage}
          />
        </Group>
      )}

      {/* 削除確認モーダル */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="ダウンロード履歴の削除"
      >
        <Stack>
          <Text>
            以下のダウンロード履歴を削除しますか？
          </Text>
          <Text size="sm" c="dimmed">
            {selectedHistory?.filename}
          </Text>
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              キャンセル
            </Button>
            <Button color="red" onClick={confirmDelete}>
              削除
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}; 