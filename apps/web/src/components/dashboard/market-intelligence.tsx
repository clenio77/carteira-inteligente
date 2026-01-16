"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/market";
import {
    Activity,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Shield,
    Loader2,
    BarChart3,
    Flame,
    Snowflake,
} from "lucide-react";

interface VolatilityData {
    ticker: string;
    current_price: number;
    volatility_daily: number;
    volatility_score: number;
    volatility_level: string;
    avg_daily_range: number;
    max_drawdown_30d: number;
    trend: string;
    recommendation: string;
}

interface Anomaly {
    ticker: string;
    anomaly_type: string;
    severity: string;
    message: string;
    deviation_percent: number;
}

interface PortfolioRisk {
    portfolio_volatility: number;
    max_volatility: number;
    high_volatility_count: number;
    risk_level: string;
    risk_message: string;
    assets_analyzed: number;
    anomalies_detected: number;
    anomalies: Anomaly[];
    volatility_details: {
        ticker: string;
        score: number;
        level: string;
        daily_volatility: number;
        trend: string;
    }[];
}

interface MarketIntelligenceProps {
    portfolioTickers?: string[];
}

export function MarketIntelligence({ portfolioTickers = [] }: MarketIntelligenceProps) {
    const tickersParam = portfolioTickers.join(",");

    const { data: riskData, isLoading, error } = useQuery<PortfolioRisk>({
        queryKey: ["portfolioRisk", tickersParam],
        queryFn: async () => {
            if (!tickersParam) return null;
            const response = await api.get(`/market/intelligence/portfolio-risk?tickers=${tickersParam}`);
            return response.data;
        },
        enabled: portfolioTickers.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutos cache
    });

    if (!portfolioTickers.length) {
        return null;
    }

    const getScoreColor = (score: number) => {
        if (score <= 3) return "text-green-600 bg-green-100";
        if (score <= 5) return "text-yellow-600 bg-yellow-100";
        if (score <= 7) return "text-orange-600 bg-orange-100";
        return "text-red-600 bg-red-100";
    };

    const getRiskIcon = (level: string) => {
        switch (level) {
            case "baixo":
                return <Shield className="w-5 h-5 text-green-500" />;
            case "moderado":
                return <Activity className="w-5 h-5 text-yellow-500" />;
            case "alto":
                return <Flame className="w-5 h-5 text-red-500" />;
            default:
                return <BarChart3 className="w-5 h-5 text-gray-500" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "high":
                return "bg-red-100 text-red-800 border-red-200";
            case "medium":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            default:
                return "bg-blue-100 text-blue-800 border-blue-200";
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-600" />
                Inteligência de Mercado
            </h3>

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Analisando carteira...</span>
                </div>
            )}

            {error && (
                <div className="text-center py-4 text-gray-500">
                    Erro ao carregar análise de risco
                </div>
            )}

            {riskData && (
                <div className="space-y-4">
                    {/* Risk Summary */}
                    <div className={`p-4 rounded-lg ${riskData.risk_level === "baixo" ? "bg-green-50 border border-green-200" :
                            riskData.risk_level === "moderado" ? "bg-yellow-50 border border-yellow-200" :
                                "bg-red-50 border border-red-200"
                        }`}>
                        <div className="flex items-center gap-3">
                            {getRiskIcon(riskData.risk_level)}
                            <div>
                                <p className="font-semibold text-gray-900">
                                    Risco {riskData.risk_level.charAt(0).toUpperCase() + riskData.risk_level.slice(1)}
                                </p>
                                <p className="text-sm text-gray-600">{riskData.risk_message}</p>
                            </div>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Vol. Média</p>
                            <p className="text-lg font-bold text-gray-900">
                                {riskData.portfolio_volatility.toFixed(1)}%
                            </p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Vol. Máxima</p>
                            <p className="text-lg font-bold text-gray-900">
                                {riskData.max_volatility.toFixed(1)}%
                            </p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Alta Vol.</p>
                            <p className={`text-lg font-bold ${riskData.high_volatility_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {riskData.high_volatility_count}/{riskData.assets_analyzed}
                            </p>
                        </div>
                    </div>

                    {/* Anomalies */}
                    {riskData.anomalies && riskData.anomalies.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                Anomalias Detectadas
                            </h4>
                            <div className="space-y-2">
                                {riskData.anomalies.slice(0, 3).map((anomaly, idx) => (
                                    <div
                                        key={idx}
                                        className={`text-sm p-2 rounded-lg border ${getSeverityColor(anomaly.severity)}`}
                                    >
                                        <span className="font-semibold">{anomaly.ticker}</span>
                                        <span className="mx-2">•</span>
                                        <span>{anomaly.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Top Volatile Assets */}
                    {riskData.volatility_details && riskData.volatility_details.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                Volatilidade por Ativo
                            </h4>
                            <div className="space-y-2">
                                {riskData.volatility_details.slice(0, 5).map((asset) => (
                                    <div key={asset.ticker} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getScoreColor(asset.score)}`}>
                                                {asset.score}
                                            </span>
                                            <span className="font-medium text-gray-900">{asset.ticker}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-gray-500">
                                                {asset.daily_volatility.toFixed(1)}%/dia
                                            </span>
                                            {asset.trend === "alta" ? (
                                                <TrendingUp className="w-4 h-4 text-green-500" />
                                            ) : asset.trend === "baixa" ? (
                                                <TrendingDown className="w-4 h-4 text-red-500" />
                                            ) : (
                                                <Activity className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
