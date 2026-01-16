"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/market";
import {
    Activity,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Loader2,
    Brain,
    X,
    Sparkles,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FullAnalysis {
    ticker: string;
    volatility: {
        ticker: string;
        current_price: number;
        volatility_daily: number;
        volatility_score: number;
        volatility_level: string;
        avg_daily_range: number;
        max_drawdown_30d: number;
        trend: string;
        recommendation: string;
    };
    anomalies: {
        ticker: string;
        anomaly_type: string;
        severity: string;
        message: string;
        deviation_percent: number;
    }[];
    ai_insight: string;
    analyzed_at: string;
}

interface AssetAnalysisModalProps {
    ticker: string;
    onClose: () => void;
}

export function AssetAnalysisModal({ ticker, onClose }: AssetAnalysisModalProps) {
    const { data: analysis, isLoading, error } = useQuery<FullAnalysis>({
        queryKey: ["fullAnalysis", ticker],
        queryFn: async () => {
            const response = await api.get(`/market/intelligence/full/${ticker}`);
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const getScoreColor = (score: number) => {
        if (score <= 3) return "text-green-600 bg-green-100";
        if (score <= 5) return "text-yellow-600 bg-yellow-100";
        if (score <= 7) return "text-orange-600 bg-orange-100";
        return "text-red-600 bg-red-100";
    };

    const getLevelBadge = (level: string) => {
        const colors: Record<string, string> = {
            baixa: "bg-green-100 text-green-800",
            moderada: "bg-yellow-100 text-yellow-800",
            alta: "bg-orange-100 text-orange-800",
            extrema: "bg-red-100 text-red-800",
        };
        return colors[level] || "bg-gray-100 text-gray-800";
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary-600" />
                        <h2 className="text-lg font-bold text-gray-900">
                            Análise IA: {ticker.toUpperCase()}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-600 mb-3" />
                            <p className="text-gray-500">Analisando {ticker}...</p>
                            <p className="text-xs text-gray-400 mt-1">Gerando insight com IA</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-8 text-gray-500">
                            Erro ao carregar análise
                        </div>
                    )}

                    {analysis && (
                        <>
                            {/* AI Insight - Destaque */}
                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                    <span className="text-sm font-semibold text-purple-800">
                                        Insight Gemini AI
                                    </span>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    {analysis.ai_insight}
                                </p>
                            </div>

                            {/* Price & Score */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="text-sm text-gray-500">Cotação</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {formatCurrency(analysis.volatility.current_price)}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500 mb-1">Score</p>
                                    <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-xl font-bold ${getScoreColor(analysis.volatility.volatility_score)}`}>
                                        {analysis.volatility.volatility_score}
                                    </span>
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Volatilidade Diária</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        {analysis.volatility.volatility_daily.toFixed(2)}%
                                    </p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Nível</p>
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getLevelBadge(analysis.volatility.volatility_level)}`}>
                                        {analysis.volatility.volatility_level.charAt(0).toUpperCase() +
                                            analysis.volatility.volatility_level.slice(1)}
                                    </span>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Max Drawdown (30d)</p>
                                    <p className="text-lg font-bold text-red-600">
                                        -{analysis.volatility.max_drawdown_30d.toFixed(1)}%
                                    </p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Tendência</p>
                                    <div className="flex items-center gap-1">
                                        {analysis.volatility.trend === "alta" ? (
                                            <TrendingUp className="w-4 h-4 text-green-500" />
                                        ) : analysis.volatility.trend === "baixa" ? (
                                            <TrendingDown className="w-4 h-4 text-red-500" />
                                        ) : (
                                            <Activity className="w-4 h-4 text-gray-400" />
                                        )}
                                        <span className="font-medium text-gray-900 capitalize">
                                            {analysis.volatility.trend}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Anomalies */}
                            {analysis.anomalies && analysis.anomalies.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                        Anomalias
                                    </h4>
                                    <div className="space-y-2">
                                        {analysis.anomalies.map((anomaly, idx) => (
                                            <div
                                                key={idx}
                                                className={`text-sm p-3 rounded-lg border ${anomaly.severity === "high"
                                                        ? "bg-red-50 border-red-200 text-red-800"
                                                        : anomaly.severity === "medium"
                                                            ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                                                            : "bg-blue-50 border-blue-200 text-blue-800"
                                                    }`}
                                            >
                                                {anomaly.message}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendation */}
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-800">
                                    {analysis.volatility.recommendation}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
                    <Button onClick={onClose} className="w-full">
                        Fechar
                    </Button>
                </div>
            </div>
        </div>
    );
}
