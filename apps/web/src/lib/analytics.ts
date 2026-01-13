import api from "./api";

export interface HistoryPoint {
    date: string;
    value: number;
}

export interface DividendPoint {
    date: string;
    value: number;
}

export const getPortfolioHistory = async (range: string = "1mo"): Promise<HistoryPoint[]> => {
    const response = await api.get(`/analytics/history?range=${range}`);
    return response.data;
};

export const getDividendHistory = async (range: string = "12mo"): Promise<DividendPoint[]> => {
    const response = await api.get(`/analytics/dividends?range=${range}`);
    return response.data;
};
