/**
 * Market Data API functions
 * Integration with brapi.dev for real-time stock quotes
 */
import api from './api';

// Types
export interface StockQuote {
  ticker: string;
  name: string;
  full_name?: string;
  currency: string;
  price: number | null;
  previous_close: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  change: number | null;
  change_percent: number | null;
  market_cap: number | null;
  updated_at: string | null;
  logo_url: string | null;
  pe_ratio: number | null;
  eps: number | null;
  dividend_yield: number | null;
}

export interface QuotesListResponse {
  success: boolean;
  count: number;
  quotes: StockQuote[];
}

export interface HistoricalDataPoint {
  date: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface HistoricalResponse {
  success: boolean;
  ticker: string;
  data: HistoricalDataPoint[];
}

export interface StockSearchResult {
  stock: string;
  name: string | null;
  close: number | null;
  change: number | null;
  volume: number | null;
  market_cap: number | null;
  logo: string | null;
  sector: string | null;
  type?: string;
}

export interface SearchResponse {
  success: boolean;
  count: number;
  results: StockSearchResult[];
}

export interface FreeStocksInfo {
  message: string;
  free_stocks: string[];
  note: string;
}

/**
 * Get info about free stocks (no auth required)
 */
export const getFreeStocksInfo = async (): Promise<FreeStocksInfo> => {
  const response = await api.get<FreeStocksInfo>('/market/free-stocks');
  return response.data;
};

/**
 * Get quote for a single stock
 */
export const getStockQuote = async (
  ticker: string,
  options?: { fundamental?: boolean; dividends?: boolean }
): Promise<StockQuote> => {
  const params: Record<string, boolean> = {};
  if (options?.fundamental) params.fundamental = true;
  if (options?.dividends) params.dividends = true;

  const response = await api.get<StockQuote>(`/market/quote/${ticker}`, { params });
  return response.data;
};

/**
 * Get quotes for multiple stocks
 */
export const getMultipleQuotes = async (
  tickers: string[],
  fundamental?: boolean
): Promise<QuotesListResponse> => {
  const params: Record<string, string | boolean> = {
    tickers: tickers.join(','),
  };
  if (fundamental) params.fundamental = true;

  const response = await api.get<QuotesListResponse>('/market/quotes', { params });
  return response.data;
};

/**
 * Get historical data for a stock
 */
export const getHistoricalData = async (
  ticker: string,
  range: string = '1mo',
  interval: string = '1d'
): Promise<HistoricalResponse> => {
  const response = await api.get<HistoricalResponse>(`/market/historical/${ticker}`, {
    params: { range, interval },
  });
  return response.data;
};

/**
 * Search stocks by name or ticker
 */
export const searchStocks = async (query: string): Promise<SearchResponse> => {
  const response = await api.get<SearchResponse>('/market/search', {
    params: { q: query },
  });
  return response.data;
};

/**
 * Check if a stock is in the free tier
 */
export const checkIfFreeStock = async (ticker: string): Promise<{
  ticker: string;
  is_free: boolean;
  message: string;
}> => {
  const response = await api.get(`/market/check/${ticker}`);
  return response.data;
};

/**
 * Get dynamic market highlights
 */
export const getMarketHighlights = async (limit: number = 8): Promise<SearchResponse> => {
  const response = await api.get<SearchResponse>('/market/highlights', {
    params: { limit },
  });
  return response.data;
};

/**
 * Helper: Format currency
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Helper: Format percentage
 */
export const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

/**
 * Helper: Format large numbers
 */
export const formatLargeNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toString();
};
