"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/market";
import { TrendingUp, TrendingDown, ArrowRight, Loader2 } from "lucide-react";

interface BenchmarkData {
    ibov: {
        symbol: string;
        name: string;
        current: number;
        change_1d: number;
    };
    cdi: {
        symbol: string;
        name: string;
        annual_rate: number;
        monthly_rate: number;
    };
    selic: {
        symbol: string;
        name: string;
        annual_rate: number;
    };
}

interface BenchmarkComparisonProps {
    portfolioReturn?: number; // Portfolio return percentage
}

export function BenchmarkComparison({ portfolioReturn = 0 }: BenchmarkComparisonProps) {
    const { data: benchmarks, isLoading } = useQuery<BenchmarkData>({
        queryKey: ["benchmarks"],
        queryFn: async () => {
            const response = await api.get("/market/benchmarks");
            return response.data;
        },
        staleTime: 60 * 60 * 1000, // 1 hour
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!benchmarks) {
        return null;
    }

    const ibovReturn = benchmarks.ibov?.change_1d || 0;
    const cdiAnnual = benchmarks.cdi?.annual_rate || 13.65;
    const selicAnnual = benchmarks.selic?.annual_rate || 13.75;

    // Calculate alpha (outperformance vs IBOV)
    const alpha = portfolioReturn - ibovReturn;

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Comparação com Benchmarks
            </h3>

            <div className="space-y-4">
                {/* Portfolio vs IBOV */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${portfolioReturn >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                            {portfolioReturn >= 0 ? (
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            ) : (
                                <TrendingDown className="w-5 h-5 text-red-600" />
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Sua Carteira</p>
                            <p className="text-xs text-gray-500">vs IBOV</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-lg font-bold ${portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {portfolioReturn >= 0 ? '+' : ''}{portfolioReturn.toFixed(2)}%
                        </p>
                        <p className={`text-xs ${alpha >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Alpha: {alpha >= 0 ? '+' : ''}{alpha.toFixed(2)}%
                        </p>
                    </div>
                </div>

                {/* IBOV */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">IBOV</p>
                            <p className="text-xs text-gray-500">Ibovespa</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">
                            {formatCurrency(benchmarks.ibov?.current || 0)}
                        </p>
                        <p className={`text-sm font-medium ${ibovReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {ibovReturn >= 0 ? '+' : ''}{ibovReturn.toFixed(2)}%
                        </p>
                    </div>
                </div>

                {/* CDI */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <ArrowRight className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">CDI</p>
                            <p className="text-xs text-gray-500">Anualizado</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold text-purple-600">
                            {cdiAnnual.toFixed(2)}% a.a.
                        </p>
                        <p className="text-xs text-gray-500">
                            ~{(cdiAnnual / 12).toFixed(2)}% a.m.
                        </p>
                    </div>
                </div>

                {/* SELIC */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <ArrowRight className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">SELIC</p>
                            <p className="text-xs text-gray-500">Taxa básica</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold text-amber-600">
                            {selicAnnual.toFixed(2)}% a.a.
                        </p>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                    {alpha > 0 ? (
                        <span className="text-green-600">✓ Você está superando o IBOV!</span>
                    ) : alpha < 0 ? (
                        <span className="text-red-600">Seu retorno está abaixo do IBOV</span>
                    ) : (
                        <span>Retorno igual ao IBOV</span>
                    )}
                </p>
            </div>
        </div>
    );
}
