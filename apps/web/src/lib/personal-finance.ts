import api from './api';

export enum TransactionType {
    INCOME = "INCOME",
    EXPENSE = "EXPENSE",
    TRANSFER = "TRANSFER"
}

export interface BankAccount {
    id: number;
    name: string;
    type: string;
    balance: number;
    color: string;
}

export interface BankAccountCreate {
    name: string;
    type: string;
    balance: number;
    color?: string;
}

export interface Category {
    id: number;
    name: string;
    icon?: string;
    type: TransactionType;
}

export interface CategoryCreate {
    name: string;
    icon?: string;
    type: TransactionType;
}

export interface PersonalTransaction {
    id: number;
    account_id: number;
    category_id?: number;
    type: TransactionType;
    amount: number;
    description?: string;
    date: string;
    is_paid: boolean;
    category_name?: string;
    account_name?: string;
}

export interface TransactionCreate {
    account_id: number;
    category_id?: number;
    type: TransactionType;
    amount: number;
    description?: string;
    date: string;
    is_paid?: boolean;
}

export interface FinanceDashboardSummary {
    total_balance: number;
    current_month: {
        income: number;
        expense: number;
        balance: number;
    };
}

// --- Accounts ---
export const getAccounts = async (): Promise<BankAccount[]> => {
    const response = await api.get<BankAccount[]>('/personal-finance/accounts');
    return response.data;
};

export const createAccount = async (data: BankAccountCreate): Promise<BankAccount> => {
    const response = await api.post<BankAccount>('/personal-finance/accounts', data);
    return response.data;
};

// --- Categories ---
export const getCategories = async (type?: TransactionType): Promise<Category[]> => {
    const response = await api.get<Category[]>('/personal-finance/categories', {
        params: { type }
    });
    return response.data;
};

export const createCategory = async (data: CategoryCreate): Promise<Category> => {
    const response = await api.post<Category>('/personal-finance/categories', data);
    return response.data;
};

export const deleteCategory = async (id: number): Promise<void> => {
    await api.delete(`/personal-finance/categories/${id}`);
};

// --- Transactions ---
export const getTransactions = async (params?: {
    start_date?: string;
    end_date?: string;
    account_id?: number;
    limit?: number;
}): Promise<PersonalTransaction[]> => {
    const response = await api.get<PersonalTransaction[]>('/personal-finance/transactions', {
        params
    });
    return response.data;
};

export const createTransaction = async (data: TransactionCreate): Promise<PersonalTransaction> => {
    const response = await api.post<PersonalTransaction>('/personal-finance/transactions', data);
    return response.data;
};

export const deleteTransaction = async (id: number): Promise<void> => {
    await api.delete(`/personal-finance/transactions/${id}`);
};

// --- Dashboard ---
export const getFinanceDashboardSummary = async (): Promise<FinanceDashboardSummary> => {
    const response = await api.post<FinanceDashboardSummary>('/personal-finance/dashboard/summary');
    return response.data;
};

export const getExpensesByCategory = async (month?: number, year?: number): Promise<{ name: string; value: number }[]> => {
    const response = await api.get<{ name: string; value: number }[]>('/personal-finance/analytics/categories', {
        params: { month, year }
    });
    return response.data;
};
