/**
 * Portfolio Management API functions
 * For adding transactions and uploading CSV files
 */
import api from './api';

// Types
export interface AddTransactionRequest {
    ticker: string;
    asset_name?: string;
    asset_type: string;
    transaction_type: 'COMPRA' | 'VENDA';
    quantity: number;
    price: number;
    transaction_date: string;
    broker?: string;
    fees?: number;
    notes?: string;
    pf_account_id?: number | null;
}

export interface TransactionResponse {
    id: number;
    ticker: string;
    asset_name: string;
    transaction_type: string;
    quantity: number;
    price: number;
    total_amount: number;
    fees: number;
    transaction_date: string;
    created_at: string;
}

export interface AddTransactionResponse {
    message: string;
    transaction: TransactionResponse;
    position_updated: boolean;
}

export interface BulkImportResponse {
    message: string;
    transactions_created: number;
    transactions_failed: number;
    errors: string[];
}

export interface PositionSummary {
    ticker: string;
    name: string;
    quantity: number;
    average_price: number;
    total_invested: number;
}

export interface CSVTemplate {
    description: string;
    columns: Record<string, string>;
    example: string;
    notes: string[];
}

/**
 * Add a new transaction
 */
export const addTransaction = async (
    data: AddTransactionRequest
): Promise<AddTransactionResponse> => {
    const response = await api.post<AddTransactionResponse>(
        '/portfolio/manage/transaction',
        data
    );
    return response.data;
};

/**
 * Upload CSV file with transactions
 */
export const uploadCSV = async (file: File): Promise<BulkImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<BulkImportResponse>(
        '/portfolio/manage/upload-csv',
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }
    );
    return response.data;
};

/**
 * Upload Brokerage Note for Analysis
 */
export const uploadNote = async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<any>(
        '/portfolio/manage/analyze-note',
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 60000, // 60s timeout for AI analysis
        }
    );
    return response.data;
};

/**
 * Get user transactions
 */
export const getTransactions = async (
    ticker?: string,
    limit?: number
): Promise<TransactionResponse[]> => {
    const params: Record<string, string | number> = {};
    if (ticker) params.ticker = ticker;
    if (limit) params.limit = limit;

    const response = await api.get<TransactionResponse[]>(
        '/portfolio/manage/transactions',
        { params }
    );
    return response.data;
};

/**
 * Delete a transaction
 */
export const deleteTransaction = async (transactionId: number): Promise<void> => {
    await api.delete(`/portfolio/manage/transaction/${transactionId}`);
};

/**
 * Get current positions
 */
export const getPositions = async (): Promise<PositionSummary[]> => {
    const response = await api.get<PositionSummary[]>('/portfolio/manage/positions');
    return response.data;
};

/**
 * Get CSV template
 */
export const getCSVTemplate = async (): Promise<CSVTemplate> => {
    const response = await api.get<CSVTemplate>('/portfolio/manage/csv-template');
    return response.data;
};

/**
 * Download template as file
 */
export const downloadCSVTemplate = async (): Promise<void> => {
    const template = await getCSVTemplate();

    const blob = new Blob([template.example], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_transacoes.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
