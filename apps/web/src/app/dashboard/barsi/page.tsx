"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, searchStocks } from "@/lib/market";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    Search,
    TrendingUp,
    TrendingDown,
    Target,
    DollarSign,
    Loader2,
    AlertCircle,
    CheckCircle,
    XCircle,
    Calculator,
} from "lucide-react";

interface BarsiAnalysis {
    ticker: string;
    current_price: number;
    average_annual_dividend: number;
    price_target: number;
    current_yield: number;
    target_yield: number;
    is_below_target: boolean;
    upside_to_target: number;
    margin_of_safety: number;
    dividend_history: { year: number; total: number }[];
    years_analyzed: number;
    recommendation: string;
}

interface SearchResult {
    stock: string;
    name: string;
    close: number;
    change: number;
    logo?: string;
}

export default function BarsiCalculatorPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
    const [showResults, setShowResults] = useState(false);

    // Live Search with debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                try {
                    const results = await searchStocks(searchQuery);
                    setSearchResults(results.results || []);
                    setShowResults(true);
                } catch (error) {
                    console.error("Search error:", error);
                }
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Fetch Barsi analysis when ticker is selected
    const { data: analysis, isLoading, error, refetch } = useQuery<BarsiAnalysis>({
        queryKey: ["barsi", selectedTicker],
        queryFn: async () => {
            if (!selectedTicker) return null;
            const response = await api.get(`/market/barsi/${selectedTicker}`);
            return response.data;
        },
        enabled: !!selectedTicker,
    });

    const handleSelectStock = (ticker: string) => {
        setSelectedTicker(ticker);
        setSearchQuery("");
        setSearchResults([]);
        setShowResults(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && searchResults.length > 0) {
            handleSelectStock(searchResults[0].stock);
        }
    };

    const getStatusColor = (analysis: BarsiAnalysis) => {
        if (analysis.margin_of_safety >= 30) return "bg-green-500";
        if (analysis.margin_of_safety >= 15) return "bg-green-400";
        if (analysis.margin_of_safety >= 0) return "bg-yellow-500";
        if (analysis.upside_to_target >= -15) return "bg-yellow-400";
        return "bg-red-500";
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Calculator className="w-6 h-6 text-primary-600" />
                                Calculadora Preço Teto Barsi
                            </h1>
                            <p className="text-gray-500">
                                Metodologia de Luiz Barsi para avaliar ações por dividendos
                            </p>
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">💡 Como funciona?</h3>
                    <p className="text-sm text-blue-800">
                        <strong>Fórmula:</strong> Preço Teto = Dividendo Médio Anual ÷ 6%
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                        Se a cotação atual está <strong>abaixo do Preço Teto</strong>, o ativo oferece
                        yield superior a 6% ao ano - considerado atrativo pela metodologia Barsi.
                    </p>
                </div>

                {/* Search Bar with Autocomplete */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6 relative z-10">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar ação por nome ou ticker (ex: PETR4, BBAS3)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                        />

                        {/* Search Results Dropdown */}
                        {showResults && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 max-h-[300px] overflow-y-auto z-50">
                                {searchResults.map((result) => (
                                    <button
                                        key={result.stock}
                                        onClick={() => handleSelectStock(result.stock)}
                                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                                    >
                                        <div className="flex items-center space-x-3">
                                            {result.logo ? (
                                                <img
                                                    src={result.logo}
                                                    alt={result.stock}
                                                    className="w-8 h-8 rounded-full"
                                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                                    <span className="text-primary-600 font-bold text-xs">
                                                        {result.stock.substring(0, 2)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="text-left">
                                                <p className="font-semibold text-gray-900">{result.stock}</p>
                                                <p className="text-sm text-gray-500 truncate max-w-[200px]">
                                                    {result.name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-gray-900">
                                                {formatCurrency(result.close)}
                                            </p>
                                            <p className={`text-sm ${result.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {result.change >= 0 ? '+' : ''}{result.change?.toFixed(2)}%
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                        <span className="ml-3 text-gray-600">Analisando {selectedTicker}...</span>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <p className="text-red-700">Erro ao buscar dados. Tente novamente.</p>
                        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                            Tentar Novamente
                        </Button>
                    </div>
                )}

                {/* Results */}
                {analysis && !isLoading && (
                    <div className="space-y-6">
                        {/* Main Result Card */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            {/* Header with Status */}
                            <div className={`${getStatusColor(analysis)} px-6 py-4`}>
                                <div className="flex items-center justify-between text-white">
                                    <div>
                                        <h2 className="text-3xl font-bold">{analysis.ticker}</h2>
                                        <p className="opacity-90">{analysis.recommendation}</p>
                                    </div>
                                    <div className="text-right">
                                        {analysis.is_below_target ? (
                                            <CheckCircle className="w-12 h-12 opacity-90" />
                                        ) : (
                                            <XCircle className="w-12 h-12 opacity-90" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Price Comparison */}
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    {/* Current Price */}
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-500 mb-1">Cotação Atual</p>
                                        <p className="text-3xl font-bold text-gray-900">
                                            {formatCurrency(analysis.current_price)}
                                        </p>
                                    </div>

                                    {/* Price Target */}
                                    <div className="text-center p-4 bg-primary-50 rounded-lg border-2 border-primary-200">
                                        <p className="text-sm text-primary-600 mb-1 flex items-center justify-center gap-1">
                                            <Target className="w-4 h-4" />
                                            Preço Teto
                                        </p>
                                        <p className="text-3xl font-bold text-primary-700">
                                            {analysis.price_target > 0 ? formatCurrency(analysis.price_target) : "—"}
                                        </p>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="grid grid-cols-3 gap-4">
                                    {/* Dividend Yield */}
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-gray-500">Yield Atual</p>
                                        <p className={`text-xl font-bold ${analysis.current_yield >= 6 ? 'text-green-600' : 'text-gray-700'}`}>
                                            {analysis.current_yield.toFixed(2)}%
                                        </p>
                                    </div>

                                    {/* Upside */}
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-gray-500">Upside ao Teto</p>
                                        <p className={`text-xl font-bold ${analysis.upside_to_target >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {analysis.price_target > 0 ? (
                                                <>{analysis.upside_to_target >= 0 ? '+' : ''}{analysis.upside_to_target.toFixed(1)}%</>
                                            ) : "—"}
                                        </p>
                                    </div>

                                    {/* Margin of Safety */}
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-gray-500">Margem Segurança</p>
                                        <p className={`text-xl font-bold ${analysis.margin_of_safety > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                            {analysis.margin_of_safety > 0 ? `${analysis.margin_of_safety.toFixed(1)}%` : '—'}
                                        </p>
                                    </div>
                                </div>

                                {/* Dividend Info */}
                                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-green-700">Dividendo Médio Anual:</span>
                                        <span className="text-lg font-bold text-green-700">
                                            {analysis.average_annual_dividend > 0
                                                ? `${formatCurrency(analysis.average_annual_dividend)} / ação`
                                                : "Sem dados de dividendos"
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dividend History */}
                        {analysis.dividend_history && analysis.dividend_history.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-600" />
                                    Histórico de Dividendos ({analysis.years_analyzed} anos)
                                </h3>
                                <div className="space-y-3">
                                    {analysis.dividend_history.map((item) => (
                                        <div key={item.year} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <span className="font-medium text-gray-700">{item.year}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-green-600 font-semibold">
                                                    {formatCurrency(item.total)} / ação
                                                </span>
                                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-green-500 h-2 rounded-full"
                                                        style={{
                                                            width: `${Math.min((item.total / Math.max(analysis.average_annual_dividend * 1.5, 0.01)) * 100, 100)}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Formula Explanation */}
                        {analysis.price_target > 0 && (
                            <div className="bg-gray-100 rounded-xl p-4 text-sm text-gray-600">
                                <p className="font-medium mb-2">📐 Cálculo:</p>
                                <code className="bg-white px-2 py-1 rounded">
                                    Preço Teto = {formatCurrency(analysis.average_annual_dividend)} ÷ 6% = {formatCurrency(analysis.price_target)}
                                </code>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {!analysis && !isLoading && !error && (
                    <div className="text-center py-12 text-gray-500">
                        <Target className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p>Busque uma ação acima para calcular o Preço Teto</p>
                        <p className="text-sm mt-2">Digite o nome ou ticker e selecione da lista</p>
                    </div>
                )}
            </div>
        </div>
    );
}
