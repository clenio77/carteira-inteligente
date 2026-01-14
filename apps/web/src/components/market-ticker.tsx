"use client";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, RefreshCw, Loader2 } from "lucide-react";
import { getMultipleQuotes, getMarketHighlights, formatCurrency, formatPercent, StockQuote } from "@/lib/market";

interface MarketTickerProps {
    /**
     * Stock tickers to display (default: free stocks)
     */
    tickers?: string[];
    refreshInterval?: number;
    compact?: boolean;
}

export function MarketTicker({
    tickers,
    refreshInterval = 60000,
    compact = false,
}: MarketTickerProps) {
    const router = useRouter();
    // If tickers provided, use getMultipleQuotes
    const isSpecific = tickers !== undefined && tickers.length > 0;

    // Query for specific tickers
    const specificQuery = useQuery({
        queryKey: ["marketQuotes", tickers],
        queryFn: () => getMultipleQuotes(tickers!),
        refetchInterval: refreshInterval,
        enabled: isSpecific,
        staleTime: 30000,
    });

    // Query for highlights (dynamic)
    const highlightsQuery = useQuery({
        queryKey: ["marketHighlights"],
        queryFn: () => getMarketHighlights(50), // Fetch more to find enough FIIs
        refetchInterval: refreshInterval,
        enabled: !isSpecific,
        staleTime: 30000,
    });

    const isLoading = isSpecific ? specificQuery.isLoading : highlightsQuery.isLoading;
    const error = isSpecific ? specificQuery.error : highlightsQuery.error;
    const refetch = isSpecific ? specificQuery.refetch : highlightsQuery.refetch;
    const isFetching = isSpecific ? specificQuery.isFetching : highlightsQuery.isFetching;

    // Normalize data structure
    let quotes: StockQuote[] = [];
    if (isSpecific && specificQuery.data?.success) {
        quotes = specificQuery.data.quotes;
    } else if (!isSpecific && highlightsQuery.data?.success) {
        // Map search results to StockQuote structure
        quotes = highlightsQuery.data.results.map(r => ({
            ticker: r.stock,
            name: r.name || r.stock,
            price: r.close,
            change: r.change,
            change_percent: r.change, // Brapi search returns change%, sometime normalization varies, assuming aligned
            logo_url: r.logo,
            currency: "BRL",
            previous_close: null,
            open: null, high: null, low: null, volume: r.volume,
            market_cap: r.market_cap, updated_at: null, pe_ratio: null, eps: null, dividend_yield: null,
            type: r.type // Custom property
        }));
    }

    // Split quotes into Stocks and FIIs
    const stocks = quotes.filter(q => {
        // Use type if available, otherwise regex fallback
        if ((q as any).type) {
            return (q as any).type === 'stock';
        }
        const suffix = q.ticker.match(/\d+$/)?.[0];
        return suffix && ['3', '4', '5', '6'].includes(suffix);
    });

    const fiis = quotes.filter(q => {
        if ((q as any).type) {
            return (q as any).type !== 'stock'; // fund or others
        }
        const suffix = q.ticker.match(/\d+$/)?.[0];
        return suffix === '11' || !suffix || !['3', '4', '5', '6'].includes(suffix);
    });

    const handleCardClick = (ticker: string) => {
        router.push(`/dashboard/market?ticker=${ticker}`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                <span className="ml-2 text-sm text-gray-500">Carregando mercado...</span>
            </div>
        );
    }

    if (error || (!isLoading && !isSpecific && !highlightsQuery.data?.success && !specificQuery.data?.success)) {
        console.error("Market Ticker Error:", error || "No data success", {
            specific: isSpecific,
            highlightSuccess: highlightsQuery.data?.success,
            specificSuccess: specificQuery.data?.success
        });
        return (
            <div className="flex items-center justify-center p-4 text-sm text-red-600">
                <span>Indisponível</span>
                <button onClick={() => refetch()} className="ml-2">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>
        );
    }

    if (compact) {
        return (
            <div className="flex items-center space-x-4 overflow-x-auto py-2 px-1">
                {quotes.map((quote) => (
                    <button key={quote.ticker} onClick={() => handleCardClick(quote.ticker)} className="text-left">
                        <CompactQuote quote={quote} />
                    </button>
                ))}
                {isFetching && (
                    <RefreshCw className="w-4 h-4 animate-spin text-gray-400 flex-shrink-0" />
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stocks Section */}
            {stocks.length > 0 && (
                <div>
                    {/* <h3 className="text-lg font-semibold text-gray-700 mb-3 ml-1">Ações</h3> */}
                    {/* Actually user said "one line with actions and other with fiis". 
                       If we have many, we might want horizontal scroll or grid. 
                       Standard grid is fine.
                   */}
                    {stocks.length > 0 && fiis.length > 0 && <h4 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Ações</h4>}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {stocks.slice(0, 4).map((quote) => (
                            <button key={quote.ticker} onClick={() => handleCardClick(quote.ticker)} className="text-left w-full">
                                <QuoteCard quote={quote} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* FIIs Section */}
            {fiis.length > 0 && (
                <div>
                    {stocks.length > 0 && fiis.length > 0 && <h4 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider mt-4">Fundos Imobiliários / Outros</h4>}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {fiis.slice(0, 4).map((quote) => (
                            <button key={quote.ticker} onClick={() => handleCardClick(quote.ticker)} className="text-left w-full">
                                <QuoteCard quote={quote} />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ... helper components remain same ...
function CompactQuote({ quote }: { quote: StockQuote }) {
    const isPositive = (quote.change_percent ?? 0) >= 0;

    return (
        <div className="flex items-center space-x-2 flex-shrink-0">
            <span className="font-semibold text-gray-900">{quote.ticker}</span>
            <span className="text-gray-700">{formatCurrency(quote.price)}</span>
            <span
                className={`flex items-center text-sm ${isPositive ? "text-green-600" : "text-red-600"
                    }`}
            >
                {isPositive ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                )}
                {formatPercent(quote.change_percent)}
            </span>
        </div>
    );
}

function QuoteCard({ quote }: { quote: StockQuote }) {
    const isPositive = (quote.change_percent ?? 0) >= 0;

    return (
        <div className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    {quote.logo_url && (
                        <img
                            src={quote.logo_url}
                            alt={quote.ticker}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                    )}
                    <div>
                        <p className="font-bold text-gray-900">{quote.ticker}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[120px]">
                            {quote.name}
                        </p>
                    </div>
                </div>
                {isPositive ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                )}
            </div>

            <div className="mt-3">
                <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(quote.price)}
                </p>
                <div className="flex items-center justify-between mt-1">
                    <span
                        className={`text-sm font-medium ${isPositive ? "text-green-600" : "text-red-600"
                            }`}
                    >
                        {formatPercent(quote.change_percent)}
                    </span>
                </div>
            </div>

            {quote.volume && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Vol</span>
                        <span>{new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(quote.volume)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MarketTicker;
