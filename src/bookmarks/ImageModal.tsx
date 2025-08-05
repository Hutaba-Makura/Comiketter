/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: 画像拡大表示用モーダルコンポーネント
 */

import React, { useState } from 'react';
import { 
  Modal, 
  Image, 
  Group, 
  ActionIcon, 
  Text, 
  Box,
  LoadingOverlay,
  Stack
} from '@mantine/core';
import { 
  IconX, 
  IconDownload, 
  IconExternalLink,
  IconZoomIn,
  IconZoomOut,
  IconRotate,
  IconMaximize
} from '@tabler/icons-react';

interface ImageModalProps {
  opened: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  opened,
  onClose,
  imageUrl,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `image_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExternalLink = () => {
    if (!imageUrl) return;
    window.open(imageUrl, '_blank');
  };

  const handleClose = () => {
    setZoom(1);
    setRotation(0);
    setIsFullscreen(false);
    onClose();
  };

  if (!imageUrl) return null;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      size="90vw"
      fullScreen={isFullscreen}
      withCloseButton={false}
      styles={{
        body: { padding: 0 },
        content: { 
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          border: 'none'
        }
      }}
    >
      <Box style={{ position: 'relative', height: '100%' }}>
        <LoadingOverlay visible={isLoading} />
        
        {/* ヘッダーツールバー */}
        <Group 
          justify="space-between" 
          p="md" 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Group>
            <ActionIcon 
              variant="subtle" 
              color="white" 
              onClick={handleZoomOut}
              disabled={zoom <= 0.25}
            >
              <IconZoomOut size={20} />
            </ActionIcon>
            <Text size="sm" color="white" style={{ minWidth: '60px', textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </Text>
            <ActionIcon 
              variant="subtle" 
              color="white" 
              onClick={handleZoomIn}
              disabled={zoom >= 3}
            >
              <IconZoomIn size={20} />
            </ActionIcon>
            <ActionIcon 
              variant="subtle" 
              color="white" 
              onClick={handleRotate}
            >
              <IconRotate size={20} />
            </ActionIcon>
            <ActionIcon 
              variant="subtle" 
              color="white" 
              onClick={handleReset}
            >
              <Text size="sm" color="white">100%</Text>
            </ActionIcon>
          </Group>

          <Group>
            <ActionIcon 
              variant="subtle" 
              color="white" 
              onClick={handleDownload}
            >
              <IconDownload size={20} />
            </ActionIcon>
            <ActionIcon 
              variant="subtle" 
              color="white" 
              onClick={handleExternalLink}
            >
              <IconExternalLink size={20} />
            </ActionIcon>
            <ActionIcon 
              variant="subtle" 
              color="white" 
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <IconMaximize size={20} />
            </ActionIcon>
            <ActionIcon 
              variant="subtle" 
              color="white" 
              onClick={handleClose}
            >
              <IconX size={20} />
            </ActionIcon>
          </Group>
        </Group>

        {/* 画像コンテナ */}
        <Box 
          style={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '60px 20px 20px 20px'
          }}
        >
          <Box
            style={{
              position: 'relative',
              maxWidth: '100%',
              maxHeight: '100%',
              overflow: 'auto',
              cursor: zoom > 1 ? 'grab' : 'default',
            }}
            onMouseDown={(e) => {
              if (zoom > 1) {
                // ドラッグ機能（簡易版）
                const startX = e.clientX;
                const startY = e.clientY;
                const startScrollLeft = e.currentTarget.scrollLeft;
                const startScrollTop = e.currentTarget.scrollTop;

                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const deltaX = moveEvent.clientX - startX;
                  const deltaY = moveEvent.clientY - startY;
                  e.currentTarget.scrollLeft = startScrollLeft - deltaX;
                  e.currentTarget.scrollTop = startScrollTop - deltaY;
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }
            }}
          >
            <Image
              src={imageUrl}
              alt="拡大表示"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center',
                transition: 'transform 0.2s ease',
                maxWidth: 'none',
                maxHeight: 'none',
              }}
              onLoad={() => {
                setIsLoading(true);
                handleImageLoad();
              }}
              onError={handleImageError}
            />
          </Box>
        </Box>

        {/* フッター情報 */}
        <Box 
          style={{ 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            padding: '10px 20px'
          }}
        >
          <Text size="xs" color="white" ta="center">
            ズーム: {Math.round(zoom * 100)}% | 回転: {rotation}° | ESCキーで閉じる
          </Text>
        </Box>
      </Box>
    </Modal>
  );
}; 