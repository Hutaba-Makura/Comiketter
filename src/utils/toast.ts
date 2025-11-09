/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: トースト通知ユーティリティ（Mantineデザイン準拠）
 */

/// <reference lib="dom" />

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  /** トーストのタイプ */
  type?: ToastType;
  /** 表示時間（ミリ秒）。0の場合は自動で閉じない */
  duration?: number;
  /** 手動で閉じるボタンを表示するか */
  withCloseButton?: boolean;
  /** トーストの位置 */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

/**
 * トースト通知を表示する
 */
export function showToast(message: string, options: ToastOptions = {}): void {
  const {
    type = 'info',
    duration = 4000,
    withCloseButton = true,
    position = 'top-right',
  } = options;

  // トーストコンテナを取得または作成
  const container = getOrCreateToastContainer(position);

  // トースト要素を作成
  const toast = createToastElement(message, type, withCloseButton);

  // コンテナに追加
  container.appendChild(toast);

  // アニメーションで表示
  requestAnimationFrame(() => {
    toast.classList.add('comiketter-toast-visible');
  });

  // 自動で閉じる
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast);
    }, duration);
  }
}

/**
 * 成功トーストを表示
 */
export function showSuccessToast(message: string, options?: Omit<ToastOptions, 'type'>): void {
  showToast(message, { ...options, type: 'success' });
}

/**
 * エラートーストを表示
 */
export function showErrorToast(message: string, options?: Omit<ToastOptions, 'type'>): void {
  showToast(message, { ...options, type: 'error' });
}

/**
 * 警告トーストを表示
 */
export function showWarningToast(message: string, options?: Omit<ToastOptions, 'type'>): void {
  showToast(message, { ...options, type: 'warning' });
}

/**
 * 情報トーストを表示
 */
export function showInfoToast(message: string, options?: Omit<ToastOptions, 'type'>): void {
  showToast(message, { ...options, type: 'info' });
}

/**
 * トーストコンテナを取得または作成
 */
function getOrCreateToastContainer(position: ToastOptions['position'] = 'top-right'): HTMLElement {
  const containerId = `comiketter-toast-container-${position}`;
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = 'comiketter-toast-container';
    container.setAttribute('data-position', position || 'top-right');
    
    // スタイルを適用
    applyContainerStyles(container, position || 'top-right');
    
    document.body.appendChild(container);
    
    // スタイルシートがまだ追加されていない場合は追加
    if (!document.getElementById('comiketter-toast-styles')) {
      injectToastStyles();
    }
  }

  return container;
}

/**
 * トースト要素を作成
 */
function createToastElement(
  message: string,
  type: ToastType,
  withCloseButton: boolean
): HTMLElement {
  const toast = document.createElement('div');
  toast.className = `comiketter-toast comiketter-toast-${type}`;

  // テーマに応じてスタイルを適用
  const theme = detectTheme();
  if (theme === 'dark') {
    toast.style.setProperty('--comiketter-toast-bg', '#25262b');
    toast.style.setProperty('--comiketter-toast-border', '#373a40');
    toast.style.setProperty('--comiketter-toast-text', '#c1c2c5');
    toast.style.setProperty('--comiketter-toast-close-color', '#868e96');
    toast.style.setProperty('--comiketter-toast-hover-bg', '#2c2e33');
    toast.style.setProperty('--comiketter-toast-active-bg', '#373a40');
  } else {
    toast.style.setProperty('--comiketter-toast-bg', '#ffffff');
    toast.style.setProperty('--comiketter-toast-border', '#e9ecef');
    toast.style.setProperty('--comiketter-toast-text', '#212529');
    toast.style.setProperty('--comiketter-toast-close-color', '#868e96');
    toast.style.setProperty('--comiketter-toast-hover-bg', '#f1f3f5');
    toast.style.setProperty('--comiketter-toast-active-bg', '#e9ecef');
  }

  // アイコン
  const icon = createIcon(type);
  toast.appendChild(icon);

  // メッセージ
  const messageElement = document.createElement('div');
  messageElement.className = 'comiketter-toast-message';
  messageElement.textContent = message;
  toast.appendChild(messageElement);

  // 閉じるボタン
  if (withCloseButton) {
    const closeButton = createCloseButton();
    closeButton.addEventListener('click', () => {
      removeToast(toast);
    });
    toast.appendChild(closeButton);
  }

  return toast;
}

/**
 * アイコンを作成
 */
function createIcon(type: ToastType): HTMLElement {
  const icon = document.createElement('div');
  icon.className = `comiketter-toast-icon comiketter-toast-icon-${type}`;
  
  // SVGアイコンを設定
  const svg = getIconSVG(type);
  icon.innerHTML = svg;
  
  return icon;
}

/**
 * アイコンSVGを取得
 */
function getIconSVG(type: ToastType): string {
  switch (type) {
    case 'success':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.7071 5.29289C17.0976 5.68342 17.0976 6.31658 16.7071 6.70711L8.70711 14.7071C8.31658 15.0976 7.68342 15.0976 7.29289 14.7071L3.29289 10.7071C2.90237 10.3166 2.90237 9.68342 3.29289 9.29289C3.68342 8.90237 4.31658 8.90237 4.70711 9.29289L8 12.5858L15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289Z" fill="currentColor"/>
        </svg>
      `;
    case 'error':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 11.4142L7.70711 13.7071C7.31658 14.0976 6.68342 14.0976 6.29289 13.7071C5.90237 13.3166 5.90237 12.6834 6.29289 12.2929L8.58579 10L6.29289 7.70711C5.90237 7.31658 5.90237 6.68342 6.29289 6.29289C6.68342 5.90237 7.31658 5.90237 7.70711 6.29289L10 8.58579L12.2929 6.29289C12.6834 5.90237 13.3166 5.90237 13.7071 6.29289C14.0976 6.68342 14.0976 7.31658 13.7071 7.70711L11.4142 10L13.7071 12.2929C14.0976 12.6834 14.0976 13.3166 13.7071 13.7071C12.6834 14.0976 12.6834 14.0976 12.2929 13.7071L10 11.4142Z" fill="currentColor"/>
        </svg>
      `;
    case 'warning':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 13C9.44772 13 9 12.5523 9 12C9 11.4477 9.44772 11 10 11C10.5523 11 11 11.4477 11 12C11 12.5523 10.5523 13 10 13ZM9 9V6H11V9H9Z" fill="currentColor"/>
        </svg>
      `;
    case 'info':
    default:
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 13C9.44772 13 9 12.5523 9 12V8C9 7.44772 9.44772 7 10 7C10.5523 7 11 7.44772 11 8V12C11 12.5523 10.5523 13 10 13ZM10 6C9.44772 6 9 5.55228 9 5C9 4.44772 9.44772 4 10 4C10.5523 4 11 4.44772 11 5C11 5.55228 10.5523 6 10 6Z" fill="currentColor"/>
        </svg>
      `;
  }
}

/**
 * 閉じるボタンを作成
 */
function createCloseButton(): HTMLElement {
  const button = document.createElement('button');
  button.className = 'comiketter-toast-close';
  button.setAttribute('aria-label', '閉じる');
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  return button;
}

/**
 * トーストを削除
 */
function removeToast(toast: HTMLElement): void {
  toast.classList.remove('comiketter-toast-visible');
  toast.classList.add('comiketter-toast-hiding');
  
  setTimeout(() => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  }, 300);
}

/**
 * コンテナのスタイルを適用
 */
function applyContainerStyles(container: HTMLElement, position: string): void {
  const styles: Record<string, string> = {
    position: 'fixed',
    zIndex: '10000',
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    maxWidth: '420px',
    width: '100%',
    boxSizing: 'border-box',
  };

  switch (position) {
    case 'top-right':
      styles.top = '16px';
      styles.right = '16px';
      styles.alignItems = 'flex-end';
      break;
    case 'top-left':
      styles.top = '16px';
      styles.left = '16px';
      styles.alignItems = 'flex-start';
      break;
    case 'bottom-right':
      styles.bottom = '16px';
      styles.right = '16px';
      styles.alignItems = 'flex-end';
      break;
    case 'bottom-left':
      styles.bottom = '16px';
      styles.left = '16px';
      styles.alignItems = 'flex-start';
      break;
    case 'top-center':
      styles.top = '16px';
      styles.left = '50%';
      styles.transform = 'translateX(-50%)';
      styles.alignItems = 'center';
      break;
    case 'bottom-center':
      styles.bottom = '16px';
      styles.left = '50%';
      styles.transform = 'translateX(-50%)';
      styles.alignItems = 'center';
      break;
  }

  Object.assign(container.style, styles);
}

/**
 * テーマを検出
 */
function detectTheme(): 'light' | 'dark' {
  // html要素のcolor-schemeスタイルから判定
  const htmlElement = document.documentElement;
  const computedStyle = getComputedStyle(htmlElement as Element);
  const colorScheme = computedStyle.getPropertyValue('color-scheme').trim();
  
  if (colorScheme === 'dark') {
    return 'dark';
  } else {
    return 'light';
  }
}

/**
 * トーストのスタイルを注入
 */
function injectToastStyles(): void {
  const style = document.createElement('style');
  style.id = 'comiketter-toast-styles';
  style.textContent = `
    .comiketter-toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      background: var(--comiketter-toast-bg, #ffffff);
      border: 1px solid var(--comiketter-toast-border, #e9ecef);
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      min-width: 300px;
      max-width: 420px;
      pointer-events: auto;
      opacity: 0;
      transform: translateY(-10px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      box-sizing: border-box;
    }

    .comiketter-toast-visible {
      opacity: 1;
      transform: translateY(0);
    }

    .comiketter-toast-hiding {
      opacity: 0;
      transform: translateY(-10px);
    }

    .comiketter-toast-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .comiketter-toast-icon svg {
      width: 100%;
      height: 100%;
    }

    .comiketter-toast-icon-success {
      color: #00ba7c;
    }

    .comiketter-toast-icon-error {
      color: #f91880;
    }

    .comiketter-toast-icon-warning {
      color: #f59f00;
    }

    .comiketter-toast-icon-info {
      color: #1da1f2;
    }

    .comiketter-toast-message {
      flex: 1;
      font-size: 14px;
      line-height: 1.5;
      color: var(--comiketter-toast-text, #212529);
      word-wrap: break-word;
    }

    .comiketter-toast-close {
      flex-shrink: 0;
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: var(--comiketter-toast-close-color, #868e96);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    .comiketter-toast-close:hover {
      background-color: var(--comiketter-toast-hover-bg, #f1f3f5);
      color: var(--comiketter-toast-text, #212529);
    }

    .comiketter-toast-close:active {
      background-color: var(--comiketter-toast-active-bg, #e9ecef);
    }

    .comiketter-toast-close svg {
      width: 16px;
      height: 16px;
    }

    /* ダークテーマ対応 */
    @media (prefers-color-scheme: dark) {
      .comiketter-toast {
        --comiketter-toast-bg: #25262b;
        --comiketter-toast-border: #373a40;
        --comiketter-toast-text: #c1c2c5;
        --comiketter-toast-close-color: #868e96;
        --comiketter-toast-hover-bg: #2c2e33;
        --comiketter-toast-active-bg: #373a40;
      }
    }

    /* Twitterのダークテーマ検出（color-scheme: dark） */
    html[style*="color-scheme: dark"] .comiketter-toast,
    html[style*="color-scheme:dark"] .comiketter-toast {
      --comiketter-toast-bg: #25262b;
      --comiketter-toast-border: #373a40;
      --comiketter-toast-text: #c1c2c5;
      --comiketter-toast-close-color: #868e96;
      --comiketter-toast-hover-bg: #2c2e33;
      --comiketter-toast-active-bg: #373a40;
    }
  `;
  document.head.appendChild(style);
  
  // テーマに応じて初期スタイルを適用
  applyThemeStyles();
  
  // テーマ変更を監視
  observeThemeChanges();
}

/**
 * テーマに応じてスタイルを適用
 */
function applyThemeStyles(): void {
  const theme = detectTheme();
  const container = document.getElementById('comiketter-toast-styles');
  if (!container) return;
  
  // 既存のトーストにテーマ属性を設定
  const toasts = document.querySelectorAll('.comiketter-toast');
  toasts.forEach((toast) => {
    const toastElement = toast as HTMLElement;
    if (theme === 'dark') {
      toastElement.style.setProperty('--comiketter-toast-bg', '#25262b');
      toastElement.style.setProperty('--comiketter-toast-border', '#373a40');
      toastElement.style.setProperty('--comiketter-toast-text', '#c1c2c5');
      toastElement.style.setProperty('--comiketter-toast-close-color', '#868e96');
      toastElement.style.setProperty('--comiketter-toast-hover-bg', '#2c2e33');
      toastElement.style.setProperty('--comiketter-toast-active-bg', '#373a40');
    } else {
      toastElement.style.setProperty('--comiketter-toast-bg', '#ffffff');
      toastElement.style.setProperty('--comiketter-toast-border', '#e9ecef');
      toastElement.style.setProperty('--comiketter-toast-text', '#212529');
      toastElement.style.setProperty('--comiketter-toast-close-color', '#868e96');
      toastElement.style.setProperty('--comiketter-toast-hover-bg', '#f1f3f5');
      toastElement.style.setProperty('--comiketter-toast-active-bg', '#e9ecef');
    }
  });
}

/**
 * テーマ変更を監視
 */
function observeThemeChanges(): void {
  const observer = new MutationObserver(() => {
    applyThemeStyles();
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style'],
  });
}

