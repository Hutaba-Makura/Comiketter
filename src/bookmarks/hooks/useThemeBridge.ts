import { useMantineColorScheme } from '@mantine/core';

/**
 * Mantineのテーマをreact-tweetに橋渡しするフック
 */
export function useThemeBridge() {
  const { colorScheme } = useMantineColorScheme();
  
  // react-tweet用のテーマ値を取得
  const themeValue = colorScheme === 'dark' ? 'dark' : 'light';
  
  return {
    themeValue,
    colorScheme
  };
}
