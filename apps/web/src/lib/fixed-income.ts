/**
 * Fixed Income API functions
 */
import api from './api';

// Types
export interface FixedIncomeInvestment {
    id: number;
    name: string;
    type: string;
    issuer: string | null;
    invested_amount: number;
    current_value: number | null;
    profit_loss: number;
    profit_loss_percentage: number;
    purchase_date: string;
    maturity_date: string | null;
    days_invested: number;
    days_to_maturity: number | null;
    is_mature: boolean;
    indexer: string;
    rate: number;
    is_percentage_of_indexer: boolean;
    rate_description: string;
    notes: string | null;
    last_updated: string | null;
    created_at: string;
}

export interface FixedIncomeListResponse {
    total_count: number;
    total_invested: number;
    total_current_value: number;
    total_profit_loss: number;
    total_profit_loss_percentage: number;
    investments: FixedIncomeInvestment[];
}

export interface AddFixedIncomeRequest {
    name: string;
    type: string;
    issuer?: string;
    invested_amount: number;
    purchase_date: string;
    maturity_date?: string;
    indexer: string;
    rate: number;
    is_percentage_of_indexer: boolean;
    notes?: string;
}

export interface InvestmentTypeInfo {
    value: string;
    label: string;
    description: string;
}

export interface TypesListResponse {
    types: InvestmentTypeInfo[];
    indexers: InvestmentTypeInfo[];
}

// API Functions
export const getFixedIncomeTypes = async (): Promise<TypesListResponse> => {
    const response = await api.get<TypesListResponse>('/fixed-income/types/list');
    return response.data;
};

export const listFixedIncomeInvestments = async (
    includeMature: boolean = true
): Promise<FixedIncomeListResponse> => {
    const response = await api.get<FixedIncomeListResponse>('/fixed-income/list', {
        params: { include_mature: includeMature },
    });
    return response.data;
};

export const addFixedIncomeInvestment = async (
    data: AddFixedIncomeRequest
): Promise<FixedIncomeInvestment> => {
    const response = await api.post<FixedIncomeInvestment>('/fixed-income/add', data);
    return response.data;
};

export const deleteFixedIncomeInvestment = async (id: number): Promise<void> => {
    await api.delete(`/fixed-income/${id}`);
};

export const updateFixedIncomeValues = async (
    selicRate: number = 13.25,
    cdiRate: number = 13.15,
    ipcaRate: number = 4.5
): Promise<{ success: boolean; message: string; updated_count: number; total_value: number }> => {
    const response = await api.post('/fixed-income/update-values', null, {
        params: { selic_rate: selicRate, cdi_rate: cdiRate, ipca_rate: ipcaRate },
    });
    return response.data;
};

// Utility functions
export const formatCurrency = (value: number | null): string => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

export const formatPercent = (value: number | null): string => {
    if (value === null) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
};

export const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
};

export const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
        TESOURO_SELIC: 'Tesouro Selic',
        TESOURO_PREFIXADO: 'Tesouro Prefixado',
        TESOURO_PREFIXADO_JUROS: 'Tesouro Prefixado c/ Juros',
        TESOURO_IPCA: 'Tesouro IPCA+',
        TESOURO_IPCA_JUROS: 'Tesouro IPCA+ c/ Juros',
        CDB: 'CDB',
        LCI: 'LCI',
        LCA: 'LCA',
        LC: 'LC',
        DEBENTURE: 'Debênture',
        CRI: 'CRI',
        CRA: 'CRA',
        POUPANCA: 'Poupança',
        OUTRO: 'Outro',
    };
    return labels[type] || type;
};

export const getTypeColor = (type: string): string => {
    if (type.startsWith('TESOURO')) {
        return 'bg-yellow-100 text-yellow-800';
    }
    switch (type) {
        case 'CDB':
            return 'bg-blue-100 text-blue-800';
        case 'LCI':
        case 'LCA':
            return 'bg-green-100 text-green-800';
        case 'DEBENTURE':
        case 'CRI':
        case 'CRA':
            return 'bg-purple-100 text-purple-800';
        case 'POUPANCA':
            return 'bg-gray-100 text-gray-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};
