import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  TextInput,
  Switch,
  Group,
  Button,
  Paper,
  Stack,
  Badge,
  ActionIcon,
  Tooltip,
  Divider,
  Alert,
} from '@mantine/core';

import { IconEye, IconEyeOff } from '@tabler/icons-react';
import type { FilenameSettingProps, PatternToken } from '@/types';
import { FilenameGenerator } from '@/utils/filenameGenerator';

interface FilenameSettingsProps {
  settings: FilenameSettingProps;
  onSettingsChange: (settings: FilenameSettingProps) => void;
  disabled?: boolean;
}

/**
 * ファイル名・パス設定コンポーネント
 * TwitterMediaHarvest準拠の設定UI
 */
export function FilenameSettings({
  settings,
  onSettingsChange,
  disabled = false,
}: FilenameSettingsProps) {
  const [previewVisible, setPreviewVisible] = useState(true);
  const [validationError, setValidationError] = useState<string | undefined>();

  // パターントークンの説明一覧
  const tokenDescriptions = FilenameGenerator.getPatternTokenDescriptions();

  /**
   * 設定を更新する
   */
  const updateSettings = useCallback(
    (updates: Partial<FilenameSettingProps>) => {
      const newSettings = { ...settings, ...updates };
      onSettingsChange(newSettings);
    },
    [settings, onSettingsChange]
  );

  /**
   * バリデーションを実行する
   */
  useEffect(() => {
    const error = FilenameGenerator.validateFilenameSettings(settings);
    setValidationError(error);
  }, [settings]);

  /**
   * トークンを追加する
   */
  const addToken = (token: PatternToken) => {
    if (!settings.filenamePattern.includes(token)) {
      updateSettings({
        filenamePattern: [...settings.filenamePattern, token],
      });
    }
  };

  /**
   * トークンを削除する
   */
  const removeToken = (index: number) => {
    const newPattern = settings.filenamePattern.filter((_, i) => i !== index);
    updateSettings({ filenamePattern: newPattern });
  };

  /**
   * トークンを有効/無効切り替えする
   */
  const toggleToken = (token: PatternToken) => {
    if (settings.filenamePattern.includes(token)) {
      removeToken(settings.filenamePattern.indexOf(token));
    } else {
      addToken(token);
    }
  };

  /**
   * プレビューを生成する
   */
  const generatePreview = () => {
    try {
      return FilenameGenerator.generatePreview(settings);
    } catch (error) {
      return 'プレビュー生成エラー';
    }
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        {/* ディレクトリ設定 */}
        <Box>
          <Text size="sm" fw={500} mb="xs">
            ディレクトリ設定
          </Text>
          <Group gap="xs" align="flex-start">
            <TextInput
              label="ディレクトリ名"
              placeholder="comiketter"
              value={settings.directory}
              onChange={(e) => updateSettings({ directory: e.target.value })}
              disabled={disabled}
              style={{ flex: 1 }}
            />
            <Switch
              label="サブディレクトリを無効化"
              checked={settings.noSubDirectory}
              onChange={(e) => updateSettings({ noSubDirectory: e.target.checked })}
              disabled={disabled}
            />
          </Group>
        </Box>

        <Divider />

        {/* ファイル名パターン設定 */}
        <Box>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500}>
              ファイル名パターン
            </Text>
            <Group gap="xs">
              <Tooltip label={previewVisible ? 'プレビューを非表示' : 'プレビューを表示'}>
                <ActionIcon
                  variant="subtle"
                  onClick={() => setPreviewVisible(!previewVisible)}
                  disabled={disabled}
                >
                  {previewVisible ? <IconEye size={24} /> : <IconEyeOff size={24} />}
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {/* プレビュー */}
          {previewVisible && (
            <Paper p="xs" bg="gray.0" mb="md">
              <Text size="xs" c="dimmed" mb="xs">
                プレビュー:
              </Text>
              <Text size="sm" style={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {generatePreview()}
              </Text>
            </Paper>
          )}

          {/* パターントークン一覧 */}
          <Box mb="md">
            {settings.filenamePattern.map((token, index) => (
              <Group
                key={token}
                gap="xs"
                mb="xs"
                p="xs"
                style={{
                  border: '1px solid var(--mantine-color-gray-3)',
                  borderRadius: 'var(--mantine-radius-sm)',
                  backgroundColor: 'var(--mantine-color-white)',
                }}
              >
                <Badge variant="light" size="sm">
                  {token}
                </Badge>
                <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                  {tokenDescriptions.find((t) => t.token === token)?.description}
                </Text>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={() => removeToken(index)}
                  disabled={disabled}
                >
                  ✕
                </ActionIcon>
              </Group>
            ))}
          </Box>

          {/* 利用可能なトークン */}
          <Text size="xs" c="dimmed" mb="xs">
            利用可能なトークン:
          </Text>
          <Group gap="xs" wrap="wrap">
            {tokenDescriptions.map(({ token, description }) => (
              <Tooltip key={token} label={description}>
                <Badge
                  variant={settings.filenamePattern.includes(token) ? 'filled' : 'outline'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => !disabled && toggleToken(token)}
                >
                  {token}
                </Badge>
              </Tooltip>
            ))}
          </Group>
        </Box>

        <Divider />

        {/* 集約設定 */}
        <Box>
          <Text size="sm" fw={500} mb="xs">
            集約設定
          </Text>
          <Group gap="xs" align="flex-start">
            <Switch
              label="アカウント別にディレクトリを分ける"
              checked={settings.fileAggregation}
              onChange={(e) => updateSettings({ fileAggregation: e.target.checked })}
              disabled={disabled}
            />
          </Group>
        </Box>

        {/* バリデーションエラー */}
        {validationError && (
          <Alert variant="light" color="red" title="設定エラー">
            {validationError}
          </Alert>
        )}

        {/* デフォルト設定ボタン */}
        <Group justify="flex-end">
          <Button
            variant="outline"
            size="xs"
            onClick={() => onSettingsChange(FilenameGenerator.getDefaultFilenameSettings())}
            disabled={disabled}
          >
            デフォルト設定に戻す
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
} 