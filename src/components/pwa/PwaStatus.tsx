import React from 'react';
import {
  Bell,
  Cloud,
  CloudOff,
  Download,
  RefreshCw,
  Share2,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { compressImageToBase64 } from '@/lib/image-utils';
import { storePendingTicketDraft } from '@/lib/pwa-drafts';
import { api } from '@/lib/api-client';

type WorkerMessage = {
  type?: string;
  count?: number;
  operationId?: string;
  status?: number;
};

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(character => character.charCodeAt(0)));
}

async function getQueueCount(worker: ServiceWorker | null): Promise<number> {
  if (!worker) return 0;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => resolve(0), 1500);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timer);
      resolve(Number(event.data?.count || 0));
    };
    worker.postMessage({ type: 'GET_QUEUE_STATUS' }, [channel.port2]);
  });
}

export function PwaStatus() {
  const [online, setOnline] = React.useState(navigator.onLine);
  const [queuedCount, setQueuedCount] = React.useState(0);
  const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [updateWorker, setUpdateWorker] = React.useState<ServiceWorker | null>(null);
  const [installed, setInstalled] = React.useState(isStandalone);
  const [notificationPermission, setNotificationPermission] = React.useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied',
  );
  const [pushSubscribed, setPushSubscribed] = React.useState(false);
  const [pushBusy, setPushBusy] = React.useState(false);
  const reloadForUpdate = React.useRef(false);
  const registrationRef = React.useRef<ServiceWorkerRegistration | null>(null);

  React.useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      toast.success('Back online', { description: 'MTrack is syncing queued updates.' });
      navigator.serviceWorker.controller?.postMessage({ type: 'SYNC_OUTBOX' });
      navigator.serviceWorker.controller?.postMessage({ type: 'REFRESH_DATA' });
    };
    const handleOffline = () => {
      setOnline(false);
      toast.info('Offline mode', { description: 'Safe changes will be queued on this device.' });
    };
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      toast.success('MTrack installed');
    };
    const handleControllerChange = () => {
      if (reloadForUpdate.current) window.location.reload();
    };
    const handleWorkerMessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data || {};
      if (message.type === 'QUEUE_STATUS') {
        setQueuedCount(Number(message.count || 0));
      } else if (message.type === 'MUTATION_QUEUED') {
        toast.info('Saved for sync', { description: 'This update will be sent when connectivity returns.' });
      } else if (message.type === 'MUTATION_SYNCED') {
        toast.success('Offline update synced');
        window.dispatchEvent(new CustomEvent('mtrack:data-synced'));
      } else if (message.type === 'MUTATION_FAILED') {
        toast.error('A queued update needs attention', {
          description: `The server rejected it${message.status ? ` (${message.status})` : ''}.`,
        });
      } else if (message.type === 'DATA_REFRESHED') {
        window.dispatchEvent(new CustomEvent('mtrack:data-synced'));
      }
    };
    const handleQueuedResponse = (event: Event) => {
      const detail = (event as CustomEvent<{ queued?: boolean }>).detail;
      if (detail?.queued) navigator.serviceWorker.controller?.postMessage({ type: 'GET_QUEUE_STATUS' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('mtrack:mutation-queued', handleQueuedResponse);

    let cleanupServiceWorker: () => void = () => {};
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleWorkerMessage);
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      const registerServiceWorker = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          registrationRef.current = registration;
          setQueuedCount(await getQueueCount(navigator.serviceWorker.controller || registration.active));
          (navigator.serviceWorker.controller || registration.active)?.postMessage({ type: 'REFRESH_DATA' });
          if ('Notification' in window && Notification.permission === 'granted' && registration.pushManager) {
            setPushSubscribed(Boolean(await registration.pushManager.getSubscription()));
          }

          if (registration.waiting) setUpdateWorker(registration.waiting);
          registration.addEventListener('updatefound', () => {
            const installing = registration.installing;
            installing?.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateWorker(installing);
                toast.info('MTrack update ready', { description: 'Apply it from the app status menu.' });
              }
            });
          });

          if (registration.periodicSync && navigator.permissions) {
            try {
              const permission = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
              if (permission.state === 'granted') {
                await registration.periodicSync.register('mtrack-ticket-refresh', { minInterval: 12 * 60 * 60 * 1000 });
              }
            } catch {
              // Periodic sync is progressive enhancement only.
            }
          }
        } catch (error) {
          console.error('Service worker registration failed', error);
        }
      };

      if (document.readyState === 'complete') void registerServiceWorker();
      else window.addEventListener('load', registerServiceWorker, { once: true });

      cleanupServiceWorker = () => {
        window.removeEventListener('load', registerServiceWorker);
        navigator.serviceWorker.removeEventListener('message', handleWorkerMessage);
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }

    if (window.launchQueue) {
      window.launchQueue.setConsumer(async ({ files }) => {
        const fileHandle = files?.[0];
        if (!fileHandle) return;
        try {
          const file = await fileHandle.getFile();
          if (!file.type.startsWith('image/')) throw new Error('Unsupported file type');
          const initialPhotoUrl = await compressImageToBase64(file, 1000, 0.6);
          storePendingTicketDraft({
            title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
            description: `Imported from ${file.name}`,
            initialPhotoUrl,
            source: 'file',
          });
          if (!window.location.pathname.startsWith('/tickets')) {
            window.location.assign('/tickets?new=1&source=file');
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not open the shared file');
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('mtrack:mutation-queued', handleQueuedResponse);
      cleanupServiceWorker();
    };
  }, []);

  React.useEffect(() => {
    if (queuedCount > 0) navigator.setAppBadge?.(queuedCount).catch(() => undefined);
    else navigator.clearAppBadge?.().catch(() => undefined);
  }, [queuedCount]);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstallPrompt(null);
  };

  const applyUpdate = () => {
    if (!updateWorker) return;
    reloadForUpdate.current = true;
    updateWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  const syncNow = async () => {
    const worker = navigator.serviceWorker.controller || registrationRef.current?.active;
    worker?.postMessage({ type: 'SYNC_OUTBOX' });
    toast.info('Sync requested');
  };

  const enableNotifications = async () => {
    if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) {
      toast.error('Notifications are not supported on this device');
      return;
    }
    if (Notification.permission === 'denied') {
      toast.error('Notifications are blocked', { description: 'Allow notifications for MTrack in your browser or device settings.' });
      return;
    }

    setPushBusy(true);
    try {
      const vapid = await api<{ publicKey: string | null; configured: boolean }>('/api/push/vapid-public-key');
      if (!vapid.configured || !vapid.publicKey) {
        throw new Error('Push delivery is not configured on the server yet.');
      }

      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== 'granted') {
        throw new Error(permission === 'denied'
          ? 'Notification permission was blocked. Enable it in browser settings.'
          : 'Notification permission was not granted.');
      }

      const registration = registrationRef.current || await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(vapid.publicKey);
      let subscription = await registration.pushManager.getSubscription();

      if (subscription?.options.applicationServerKey) {
        const existingKey = new Uint8Array(subscription.options.applicationServerKey);
        const keyMatches = existingKey.length === applicationServerKey.length &&
          existingKey.every((byte, index) => byte === applicationServerKey[index]);
        if (!keyMatches) {
          await subscription.unsubscribe();
          subscription = null;
        }
      }

      subscription = subscription || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const saved = await api<{ id: string }>('/api/push-subscriptions', {
        method: 'POST',
        body: JSON.stringify(subscription.toJSON()),
      });
      localStorage.setItem('mtrack:push-subscription-id', saved.id);

      setPushSubscribed(true);
      toast.success('Notifications enabled', { description: 'MTrack will notify this device about ticket activity.' });
    } catch (error) {
      console.error('Push notification setup failed', error);
      setPushSubscribed(false);
      toast.error('Could not enable push notifications', {
        description: error instanceof Error ? error.message : 'Push setup failed.',
      });
    } finally {
      setPushBusy(false);
    }
  };

  const shareApp = async () => {
    if (!navigator.share) {
      await navigator.clipboard?.writeText(window.location.href);
      toast.success('Link copied');
      return;
    }
    await navigator.share({ title: 'MTrack', text: 'Open the MTrack maintenance workspace', url: window.location.href });
  };

  return (
    <>
      {!online && (
        <div role="status" className="fixed left-1/2 top-3 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-xl dark:border dark:border-slate-800">
          <CloudOff className="h-3.5 w-3.5 text-amber-300" />
          Offline mode
          {queuedCount > 0 && <span className="text-slate-300">· {queuedCount} waiting</span>}
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Open app status and install controls"
            className="fixed right-3 top-3 z-[75] h-9 w-9 rounded-full border-white/60 bg-white/90 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90"
          >
            {online ? <Cloud className="h-4 w-4 text-teal-600" /> : <CloudOff className="h-4 w-4 text-amber-500" />}
            {queuedCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                {queuedCount > 9 ? '9+' : queuedCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-xl p-2">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>MTrack app status</span>
            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${online ? 'text-emerald-600' : 'text-amber-600'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {online ? 'Online' : 'Offline'}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {installPrompt && !installed && (
            <DropdownMenuItem onSelect={installApp} className="rounded-lg">
              <Download className="h-4 w-4" /> Install MTrack
            </DropdownMenuItem>
          )}
          {updateWorker && (
            <DropdownMenuItem onSelect={applyUpdate} className="rounded-lg">
              <RefreshCw className="h-4 w-4" /> Apply available update
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={syncNow} disabled={!online || queuedCount === 0} className="rounded-lg">
            <Wifi className="h-4 w-4" /> Sync queued changes
            {queuedCount > 0 && <span className="ml-auto text-xs font-bold">{queuedCount}</span>}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={pushSubscribed ? undefined : enableNotifications}
            disabled={pushBusy || pushSubscribed}
            className="rounded-lg"
          >
            <Bell className="h-4 w-4" />
            {pushBusy
              ? 'Checking notifications…'
              : notificationPermission === 'denied'
                ? 'Notifications blocked'
                : pushSubscribed
                  ? 'Notifications enabled'
                  : notificationPermission === 'granted'
                    ? 'Repair notifications'
                    : 'Enable notifications'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={shareApp} className="rounded-lg">
            <Share2 className="h-4 w-4" /> Share MTrack
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5" />
            {installed ? 'Running as an installed app' : 'Browser mode'}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
