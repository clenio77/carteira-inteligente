'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react';

export function PWAStatusBadge() {
    const [isOnline, setIsOnline] = useState(true);
    const [showStatus, setShowStatus] = useState(false);

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setShowStatus(true);
            // Hide status after 3 seconds when back online
            setTimeout(() => setShowStatus(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowStatus(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Only show when offline or transitioning
    if (!showStatus && isOnline) {
        return null;
    }

    return (
        <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium shadow-lg backdrop-blur-xl border transition-all duration-300 animate-in slide-in-from-top-2 ${isOnline
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}
        >
            {isOnline ? (
                <>
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Conectado</span>
                </>
            ) : (
                <>
                    <CloudOff className="w-3.5 h-3.5 animate-pulse" />
                    <span>Modo Offline</span>
                </>
            )}
        </div>
    );
}
