'use client';

import { useState, useEffect, useCallback } from 'react';

interface PWAState {
    isInstalled: boolean;
    isOnline: boolean;
    isUpdateAvailable: boolean;
    canInstall: boolean;
    isPWA: boolean;
}

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export function usePWA() {
    const [state, setState] = useState<PWAState>({
        isInstalled: false,
        isOnline: true,
        isUpdateAvailable: false,
        canInstall: false,
        isPWA: false,
    });

    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [serviceWorker, setServiceWorker] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        // Check if running as PWA
        const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        setState(prev => ({
            ...prev,
            isPWA,
            isInstalled: isPWA,
            isOnline: navigator.onLine,
        }));

        // Listen for install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setState(prev => ({ ...prev, canInstall: true }));
        };

        // Listen for app installed
        const handleAppInstalled = () => {
            setState(prev => ({ ...prev, isInstalled: true, canInstall: false }));
            setDeferredPrompt(null);
        };

        // Listen for online/offline
        const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
        const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check for service worker updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                setServiceWorker(registration);

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setState(prev => ({ ...prev, isUpdateAvailable: true }));
                            }
                        });
                    }
                });
            });
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const install = useCallback(async () => {
        if (!deferredPrompt) return false;

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                setState(prev => ({ ...prev, isInstalled: true, canInstall: false }));
                setDeferredPrompt(null);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error installing PWA:', error);
            return false;
        }
    }, [deferredPrompt]);

    const update = useCallback(() => {
        if (serviceWorker?.waiting) {
            serviceWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
        }
    }, [serviceWorker]);

    const share = useCallback(async (data: ShareData) => {
        if (navigator.share) {
            try {
                await navigator.share(data);
                return true;
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    console.error('Error sharing:', error);
                }
                return false;
            }
        }
        return false;
    }, []);

    return {
        ...state,
        install,
        update,
        share,
        canShare: typeof navigator !== 'undefined' && 'share' in navigator,
    };
}
