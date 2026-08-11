/// <reference types="vite/client" />

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface LaunchParams {
  files: FileSystemFileHandle[];
  targetURL?: string;
}

interface LaunchQueue {
  setConsumer(consumer: (launchParams: LaunchParams) => void | Promise<void>): void;
}

interface Window {
  launchQueue?: LaunchQueue;
}

interface Navigator {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}

interface ServiceWorkerRegistration {
  periodicSync?: {
    register(tag: string, options?: { minInterval?: number }): Promise<void>;
  };
}
