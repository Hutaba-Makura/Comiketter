/**
 * CBインポートモーダルコンポーネント
 */

import React, { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  FileButton,
  Radio,
  Alert,
  Progress,
  ScrollArea,
  Box
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react';
import { cbCsvImportService, ImportMode, ImportResult } from '../services/cbCsvImportService';
import { getTextSync, useI18n } from '../utils/i18n';

interface CbImportModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * CBインポートモーダル
 */
export function CbImportModal({ opened, onClose, onSuccess }: CbImportModalProps) {
  // eslint-disable-next-line no-undef
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('create');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // i18n機能を一元管理
  useI18n();

  // eslint-disable-next-line no-undef
  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await cbCsvImportService.importFromFile(selectedFile, importMode);
      setImportResult(result);

      if (result.success && onSuccess) {
        // 成功時は少し待ってからコールバックを呼ぶ
        // eslint-disable-next-line no-undef
        setTimeout(() => {
          onSuccess();
        }, 1000);
      }
    } catch (error) {
      console.error('インポートエラー:', error);
      setImportResult({
        success: false,
        importedCbCount: 0,
        importedTweetCount: 0,
        skippedTweetCount: 0,
        errors: [{
          rowNumber: 0,
          message: error instanceof Error ? error.message : 'インポートに失敗しました'
        }]
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      setSelectedFile(null);
      setImportResult(null);
      setImportMode('create');
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={getTextSync('import_cb')}
      size="lg"
      closeOnClickOutside={!isImporting}
      closeOnEscape={!isImporting}
    >
      <Stack gap="md">
        {/* ファイル選択 */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            {getTextSync('select_csv_file')}
          </Text>
          <Group>
            <FileButton
              onChange={handleFileSelect}
              accept=".csv"
              disabled={isImporting}
            >
              {(props) => (
                <Button {...props} variant="light" disabled={isImporting}>
                  {getTextSync('select_file')}
                </Button>
              )}
            </FileButton>
            {selectedFile && (
              <Text size="sm" c="dimmed">
                {selectedFile.name}
              </Text>
            )}
          </Group>
        </Stack>

        {/* インポート方式選択 */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            {getTextSync('import_mode')}
          </Text>
          <Radio.Group
            value={importMode}
            onChange={(value) => setImportMode(value as ImportMode)}
            disabled={isImporting}
          >
            <Stack gap="xs">
              <Radio
                value="create"
                label={getTextSync('import_mode_create')}
                description={getTextSync('import_mode_create_desc')}
              />
              <Radio
                value="overwrite"
                label={getTextSync('import_mode_overwrite')}
                description={getTextSync('import_mode_overwrite_desc')}
              />
              <Radio
                value="merge"
                label={getTextSync('import_mode_merge')}
                description={getTextSync('import_mode_merge_desc')}
              />
            </Stack>
          </Radio.Group>
        </Stack>

        {/* インポート結果 */}
        {importResult && (
          <Stack gap="xs">
            {importResult.success ? (
              <Alert icon={<IconCheck size={16} />} color="green" title={getTextSync('import_success')}>
                <Text size="sm">
                  {getTextSync('import_result_summary', {
                    cbCount: importResult.importedCbCount.toString(),
                    tweetCount: importResult.importedTweetCount.toString(),
                    skippedCount: importResult.skippedTweetCount.toString()
                  })}
                </Text>
              </Alert>
            ) : (
              <Alert icon={<IconX size={16} />} color="red" title={getTextSync('import_failed')}>
                <Text size="sm">
                  {getTextSync('import_error_summary', {
                    errorCount: importResult.errors.length.toString()
                  })}
                </Text>
              </Alert>
            )}

            {/* エラー詳細 */}
            {importResult.errors.length > 0 && (
              <Box>
                <Text size="sm" fw={500} mb="xs">
                  {getTextSync('import_errors')} ({importResult.errors.length})
                </Text>
                <ScrollArea h={150}>
                  <Stack gap="xs">
                    {importResult.errors.map((error, index) => (
                      <Alert
                        key={index}
                        icon={<IconAlertCircle size={16} />}
                        color="yellow"
                        title={`${getTextSync('row')} ${error.rowNumber}`}
                      >
                        <Text size="xs">{error.message}</Text>
                      </Alert>
                    ))}
                  </Stack>
                </ScrollArea>
              </Box>
            )}
          </Stack>
        )}

        {/* プログレス */}
        {isImporting && (
          <Box>
            <Text size="sm" mb="xs">
              {getTextSync('importing')}
            </Text>
            <Progress value={100} animated />
          </Box>
        )}

        {/* アクションボタン */}
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={handleClose}
            disabled={isImporting}
          >
            {importResult && importResult.success ? getTextSync('close') : getTextSync('cancel')}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            loading={isImporting}
          >
            {getTextSync('import')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

