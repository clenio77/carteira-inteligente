"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { isAuthenticated } from "@/lib/auth";
import {
    getStockQuote,
    getMultipleQuotes,
    searchStocks,
    getHistoricalData,
    formatCurrency,
    formatPercent,
    formatLargeNumber,
    StockQuote,
} from "@/lib/market";
import {
    TrendingUp,
    TrendingDown,
    Search,
    RefreshCw,
    Loader2,
    BarChart3,
    Building2,
    DollarSign,
    Activity,
    ArrowLeft,
    Info,
    PieChart,
    Target,
    Percent,
    Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";


import { Suspense } from "react";

// ... imports remain the same ...

function MarketContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push("/login");
        }
    }, [router]);

    // Check for ticker param on mount
    useEffect(() => {
        const tickerParam = searchParams.get("ticker");
        if (tickerParam) {
            setSelectedTicker(tickerParam);
            // Optionally clean URL
            // router.replace("/dashboard/market", { scroll: false });
        }
    }, [searchParams]);



    // Fetch selected stock detail
    const { data: selectedStock, isLoading: stockLoading, error: stockError } = useQuery({
        queryKey: ["stockQuote", selectedTicker],
        queryFn: () =>
            selectedTicker
                ? getStockQuote(selectedTicker, { fundamental: true, dividends: true })
                : null,
        enabled: !!selectedTicker,
        retry: 2,
    });

    // Fetch historical data for selected stock
    const { data: historicalData, isLoading: histLoading } = useQuery({
        queryKey: ["stockHistorical", selectedTicker],
        queryFn: () =>
            selectedTicker ? getHistoricalData(selectedTicker, "1mo", "1d") : null,
        enabled: !!selectedTicker,
    });

    // Live Search Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                // Perform search
                try {
                    // setIsSearching(true); // Maybe too flashy for typing?
                    const results = await searchStocks(searchQuery);
                    setSearchResults(results.results);
                } catch (error) {
                    // console.error(error);
                }
            } else {
                setSearchResults([]);
            }
        }, 300); // 300ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Handle initial search (manual button)
    const handleSearch = async () => {
        if (searchQuery.length < 2) return;

        setIsSearching(true);
        try {
            const results = await searchStocks(searchQuery);
            setSearchResults(results.results);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    // Search on enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            // Let the effect or selection handle it, 
            // but if user hits enter, maybe select first result?
            if (searchResults.length > 0) {
                setSelectedTicker(searchResults[0].stock);
                setSearchResults([]);
                setSearchQuery("");
            } else {
                handleSearch();
            }
        }
    };



    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar
                            </Button>
                        </Link>
                        <BarChart3 className="w-8 h-8 text-primary-600" />
                        <h1 className="text-3xl font-bold text-gray-900">
                            Cotações do Mercado
                        </h1>
                    </div>
                    <div className="flex items-center space-x-2">
                        {/* Removed auto-refresh button since we don't have a default list anymore */}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6 relative z-10">
                    <div className="flex items-center space-x-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar ação por nome ou ticker (ex: PETR4, VALE3)..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (e.target.value.length >= 2) {
                                        // Simple debounce could also be added, for now direct call on 2+ chars
                                        // But wait, the user wants live search.
                                        // We'll use a timeout effect for debounce.
                                    } else {
                                        setSearchResults([]);
                                    }
                                }}
                                onKeyDown={handleKeyDown}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />

                            {/* Live Search Results Dropdown */}
                            {searchResults.length > 0 && searchQuery.length >= 2 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 max-h-[300px] overflow-y-auto z-50">
                                    {searchResults.map((result) => (
                                        <button
                                            key={result.stock}
                                            onClick={() => {
                                                setSelectedTicker(result.stock);
                                                setSearchResults([]);
                                                setSearchQuery(""); // Clear or keep? Usually clear to show selection in detail view
                                            }}
                                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                                        >
                                            <div className="flex items-center space-x-3">
                                                {result.logo ? (
                                                    <img src={result.logo} alt={result.stock} className="w-8 h-8 rounded-full" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                                ) : (
                                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">{result.stock.substring(0, 2)}</div>
                                                )}
                                                <div className="text-left">
                                                    <p className="font-bold text-gray-900">{result.stock}</p>
                                                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{result.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {result.close && <p className="font-medium text-gray-900">{formatCurrency(result.close)}</p>}
                                                {result.change !== null && <p className={`text-xs ${result.change >= 0 ? "text-green-600" : "text-red-600"}`}>{result.change >= 0 ? "+" : ""}{formatPercent(result.change)}</p>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Button onClick={handleSearch} disabled={isSearching}>
                            {isSearching ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Search className="w-4 h-4 mr-2" />
                            )}
                            Buscar
                        </Button>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <div className="mt-4 border-t pt-4">
                            <p className="text-sm text-gray-500 mb-2">
                                {searchResults.length} resultado(s) encontrado(s)
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {searchResults.slice(0, 8).map((result) => (
                                    <button
                                        key={result.stock}
                                        onClick={() => {
                                            setSelectedTicker(result.stock);
                                            setSearchResults([]);
                                            setSearchQuery("");
                                        }}
                                        className="text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center space-x-2">
                                            {result.logo && (
                                                <img
                                                    src={result.logo}
                                                    alt={result.stock}
                                                    className="w-8 h-8 rounded-full"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = "none";
                                                    }}
                                                />
                                            )}
                                            <div>
                                                <p className="font-semibold text-gray-900">{result.stock}</p>
                                                <p className="text-xs text-gray-500 truncate max-w-[120px]">
                                                    {result.name || "—"}
                                                </p>
                                            </div>
                                        </div>
                                        {result.close && (
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-sm font-medium">
                                                    {formatCurrency(result.close)}
                                                </span>
                                                {result.change !== null && (
                                                    <span className={`text-xs ${result.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatPercent(result.change)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {result.sector && (
                                            <p className="text-xs text-gray-400 mt-1">{result.sector}</p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Selected Stock Detail */}
                {selectedTicker && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                                {selectedStock?.logo_url && (
                                    <img
                                        src={selectedStock.logo_url}
                                        alt={selectedTicker}
                                        className="w-14 h-14 rounded-full border-2 border-gray-100"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none";
                                        }}
                                    />
                                )}
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {selectedTicker}
                                    </h2>
                                    <p className="text-gray-500">
                                        {selectedStock?.full_name || selectedStock?.name || "Carregando..."}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTicker(null)}
                            >
                                ✕ Fechar
                            </Button>
                        </div>

                        {stockLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                                <span className="ml-3 text-gray-600">Carregando dados...</span>
                            </div>
                        ) : stockError ? (
                            <div className="text-center py-8">
                                <p className="text-red-500">Erro ao carregar dados. Tente novamente.</p>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => setSelectedTicker(selectedTicker)}
                                >
                                    Tentar Novamente
                                </Button>
                            </div>
                        ) : selectedStock ? (
                            <>
                                {/* Main Price Section */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    {/* Price Card - Hero */}
                                    <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-6 text-white col-span-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-primary-100">Preço Atual</span>
                                            <DollarSign className="w-5 h-5 text-primary-200" />
                                        </div>
                                        <p className="text-4xl font-bold">
                                            {formatCurrency(selectedStock.price)}
                                        </p>
                                        <div className="flex items-center space-x-3 mt-3">
                                            <span
                                                className={`px-2 py-1 rounded-full text-sm font-medium ${(selectedStock.change_percent ?? 0) >= 0
                                                    ? "bg-green-400/20 text-green-100"
                                                    : "bg-red-400/20 text-red-100"
                                                    }`}
                                            >
                                                {formatPercent(selectedStock.change_percent)}
                                            </span>
                                            <span className="text-primary-200 text-sm">
                                                {selectedStock.change !== null && (
                                                    <>
                                                        {selectedStock.change >= 0 ? "+" : ""}
                                                        {selectedStock.change?.toFixed(2) ?? "0.00"}
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                        <p className="text-xs text-primary-200 mt-3">
                                            Atualizado: {selectedStock.updated_at
                                                ? new Date(selectedStock.updated_at).toLocaleString("pt-BR")
                                                : "—"}
                                        </p>
                                    </div>

                                    {/* High/Low Card */}
                                    <div className="bg-gray-50 rounded-xl p-6 col-span-2">
                                        <p className="text-sm text-gray-500 mb-4 font-medium">Variação do Dia</p>
                                        <div className="flex items-center space-x-6">
                                            <div className="text-center">
                                                <p className="text-xs text-gray-400 uppercase">Mínima</p>
                                                <p className="text-xl font-bold text-red-600">
                                                    {formatCurrency(selectedStock.low)}
                                                </p>
                                            </div>
                                            <div className="flex-1">
                                                <div className="h-3 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full relative">
                                                    {selectedStock.price !== null &&
                                                        selectedStock.low !== null &&
                                                        selectedStock.high !== null &&
                                                        selectedStock.high !== selectedStock.low && (
                                                            <div
                                                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-3 border-gray-700 rounded-full shadow-lg"
                                                                style={{
                                                                    left: `calc(${((selectedStock.price - selectedStock.low) /
                                                                        (selectedStock.high - selectedStock.low)) *
                                                                        100
                                                                        }% - 8px)`,
                                                                }}
                                                            />
                                                        )}
                                                </div>
                                                <div className="flex justify-between mt-1">
                                                    <span className="text-xs text-gray-400">Min</span>
                                                    <span className="text-xs text-gray-600 font-medium">
                                                        Atual: {formatCurrency(selectedStock.price)}
                                                    </span>
                                                    <span className="text-xs text-gray-400">Max</span>
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-400 uppercase">Máxima</p>
                                                <p className="text-xl font-bold text-green-600">
                                                    {formatCurrency(selectedStock.high)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                            <div>
                                                <p className="text-xs text-gray-400">Abertura</p>
                                                <p className="font-semibold text-gray-700">
                                                    {formatCurrency(selectedStock.open)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400">Fech. Anterior</p>
                                                <p className="font-semibold text-gray-700">
                                                    {formatCurrency(selectedStock.previous_close)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                                    {/* Volume */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-gray-500 uppercase">Volume</span>
                                            <Activity className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <p className="text-xl font-bold text-gray-900">
                                            {formatLargeNumber(selectedStock.volume)}
                                        </p>
                                        <p className="text-xs text-gray-400">Negociações hoje</p>
                                    </div>

                                    {/* Market Cap */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-gray-500 uppercase">Valor de Mercado</span>
                                            <Building2 className="w-4 h-4 text-purple-500" />
                                        </div>
                                        <p className="text-xl font-bold text-gray-900">
                                            R$ {formatLargeNumber(selectedStock.market_cap)}
                                        </p>
                                        <p className="text-xs text-gray-400">Market Cap</p>
                                    </div>

                                    {/* P/E Ratio */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-gray-500 uppercase">P/L</span>
                                            <PieChart className="w-4 h-4 text-orange-500" />
                                        </div>
                                        <p className="text-xl font-bold text-gray-900">
                                            {selectedStock.pe_ratio?.toFixed(2) ?? "N/A"}
                                        </p>
                                        <p className="text-xs text-gray-400">Preço/Lucro</p>
                                    </div>

                                    {/* EPS */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-gray-500 uppercase">LPA</span>
                                            <Target className="w-4 h-4 text-green-500" />
                                        </div>
                                        <p className="text-xl font-bold text-gray-900">
                                            {selectedStock.eps ? `R$ ${selectedStock.eps?.toFixed(2)}` : "N/A"}
                                        </p>
                                        <p className="text-xs text-gray-400">Lucro por Ação</p>
                                    </div>

                                    {/* Dividend Yield */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-gray-500 uppercase">Dividend Yield</span>
                                            <Percent className="w-4 h-4 text-teal-500" />
                                        </div>
                                        <p className="text-xl font-bold text-gray-900">
                                            {selectedStock.dividend_yield
                                                ? `${selectedStock.dividend_yield?.toFixed(2)}%`
                                                : "N/A"}
                                        </p>
                                        <p className="text-xs text-gray-400">Rendimento anual</p>
                                    </div>
                                </div>

                                {/* Historical Chart */}
                                {histLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                                        <span className="ml-2 text-gray-500">Carregando histórico...</span>
                                    </div>
                                ) : historicalData?.success && historicalData.data.length > 0 ? (
                                    <div className="pt-6 border-t">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-gray-700 flex items-center">
                                                <Calendar className="w-4 h-4 mr-2" />
                                                Histórico de Preços (30 dias)
                                            </h3>
                                        </div>
                                        <div className="flex items-end space-x-1 h-32 bg-gray-50 rounded-lg p-4">
                                            {historicalData.data.slice(-30).map((point, index) => {
                                                const prices = historicalData.data.map((p) => p.close ?? 0);
                                                const min = Math.min(...prices);
                                                const max = Math.max(...prices);
                                                const height =
                                                    max > min
                                                        ? ((point.close ?? 0) - min) / (max - min)
                                                        : 0.5;
                                                const isLast = index === historicalData.data.slice(-30).length - 1;

                                                return (
                                                    <div
                                                        key={index}
                                                        className={`flex-1 ${isLast ? 'bg-primary-600' : 'bg-primary-400'} rounded-t-sm hover:bg-primary-600 transition-colors cursor-pointer`}
                                                        style={{
                                                            height: `${Math.max(height * 100, 8)}%`,
                                                            minHeight: "6px",
                                                        }}
                                                        title={`${new Date(point.date * 1000).toLocaleDateString(
                                                            "pt-BR"
                                                        )}: ${formatCurrency(point.close)}`}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-400 mt-2">
                                            <span>30 dias atrás</span>
                                            <span>Hoje</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-6 border-t">
                                        <p className="text-gray-400 text-center py-4">
                                            Histórico de preços não disponível
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-500">Não foi possível carregar os dados.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Info Banner */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-blue-800">
                                <strong>Dados em tempo real:</strong> As cotações são atualizadas
                                automaticamente a cada minuto via brapi.dev. Os dados podem ter
                                atraso de 15-30 minutos em relação ao mercado.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MarketPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Carregando...</p>
                </div>
            </div>
        }>
            <MarketContent />
        </Suspense>
    );
}

/**
 * Quote Card Component
 */
function QuoteCard({
    quote,
    onClick,
    isSelected,
}: {
    quote: StockQuote;
    onClick: () => void;
    isSelected: boolean;
}) {
    const isPositive = (quote.change_percent ?? 0) >= 0;

    return (
        <button
            onClick={onClick}
            className={`w-full text-left bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all ${isSelected ? "ring-2 ring-primary-500 shadow-md" : ""
                }`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    {quote.logo_url && (
                        <img
                            src={quote.logo_url}
                            alt={quote.ticker}
                            className="w-10 h-10 rounded-full object-cover border border-gray-100"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                    )}
                    <div>
                        <p className="text-lg font-bold text-gray-900">{quote.ticker}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[140px]">
                            {quote.name}
                        </p>
                    </div>
                </div>
                {isPositive ? (
                    <TrendingUp className="w-6 h-6 text-green-500" />
                ) : (
                    <TrendingDown className="w-6 h-6 text-red-500" />
                )}
            </div>

            <div className="mt-2">
                <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(quote.price)}
                </p>
                <div className="flex items-center justify-between mt-1">
                    <span
                        className={`text-sm font-semibold ${isPositive ? "text-green-600" : "text-red-600"
                            }`}
                    >
                        {formatPercent(quote.change_percent)}
                    </span>
                    {quote.change !== null && (
                        <span
                            className={`text-sm ${isPositive ? "text-green-600" : "text-red-600"}`}
                        >
                            {isPositive ? "+" : ""}
                            {quote.change?.toFixed(2) ?? "0.00"}
                        </span>
                    )}
                </div>
            </div>

            {/* Additional Info */}
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                {quote.pe_ratio !== null && (
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500">P/L</span>
                        <span className="font-medium text-gray-700">
                            {quote.pe_ratio?.toFixed(2) ?? "N/A"}
                        </span>
                    </div>
                )}
                {quote.volume !== null && (
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Volume</span>
                        <span className="font-medium text-gray-700">
                            {formatLargeNumber(quote.volume)}
                        </span>
                    </div>
                )}
            </div>
        </button>
    );
}
