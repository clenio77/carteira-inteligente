'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

export function UpdatePrompt() {
    const [showUpdate, setShowUpdate] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        const handleControllerChange = () => {
            window.location.reload();
        };

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        navigator.serviceWorker.ready.then(registration => {
            // Check if there's already a waiting worker
            if (registration.waiting) {
                setWaitingWorker(registration.waiting);
                setShowUpdate(true);
            }

            // Listen for new updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        setWaitingWorker(newWorker);
                        setShowUpdate(true);
                    }
                });
            });
        });

        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
    }, []);

    const handleUpdate = () => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
    };

    const handleDismiss = () => {
        setShowUpdate(false);
    };

    if (!showUpdate) return null;

    return (
        <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top-2 duration-500 md:left-auto md:right-6 md:max-w-sm">
            <div className="bg-gradient-to-br from-blue-900/90 to-indigo-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-blue-500/30 overflow-hidden">
                {/* Gradient bar */}
                <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-xl animate-pulse">
                                <Sparkles className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-sm">
                                    Atualização Disponível
                                </h3>
                                <p className="text-xs text-blue-200/70">
                                    Nova versão pronta para instalar
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Fechar"
                        >
                            <X className="w-4 h-4 text-blue-200" />
                        </button>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-blue-200/80 mb-4">
                        Uma nova versão do Carteira Inteligente está disponível com melhorias e correções.
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleUpdate}
                            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Atualizar Agora
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors text-sm"
                        >
                            Depois
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
