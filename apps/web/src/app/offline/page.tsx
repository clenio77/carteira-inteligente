'use client';

import { WifiOff, RefreshCw, Home, TrendingUp } from 'lucide-react';

export default function OfflinePage() {
    const handleRetry = () => {
        window.location.reload();
    };

    const handleGoHome = () => {
        window.location.href = '/dashboard';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* Animated Icon */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
                    <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-full p-8 inline-block border border-slate-700/50">
                        <WifiOff className="w-16 h-16 text-slate-400 mx-auto" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                    <TrendingUp className="w-8 h-8 text-green-500" />
                    Carteira Inteligente
                </h1>

                {/* Message */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 mb-6">
                    <h2 className="text-xl font-semibold text-white mb-2">
                        Você está offline
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Parece que você perdeu a conexão com a internet.
                        Verifique sua conexão e tente novamente.
                    </p>
                </div>

                {/* Cached Data Notice */}
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20 mb-6">
                    <p className="text-green-400 text-sm">
                        💡 <strong>Dica:</strong> Alguns dados podem estar disponíveis em cache.
                        Ao reconectar, suas informações serão atualizadas automaticamente.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={handleRetry}
                        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Tentar novamente
                    </button>

                    <button
                        onClick={handleGoHome}
                        className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                        <Home className="w-5 h-5" />
                        Ir para o início
                    </button>
                </div>

                {/* Footer */}
                <p className="text-slate-500 text-xs mt-8">
                    © 2026 Clenio Consultory
                </p>
            </div>
        </div>
    );
}
