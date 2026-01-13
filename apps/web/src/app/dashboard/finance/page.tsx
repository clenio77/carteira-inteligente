"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    Plus,
    Trash2,
    Landmark,
    Calendar,
    ArrowRightLeft,
    ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    getAccounts,
    getTransactions,
    createAccount,
    createTransaction,
    deleteTransaction,
    getFinanceDashboardSummary,
    getCategories,
    TransactionType,
    BankAccount
} from "@/lib/personal-finance";
import { formatCurrency } from "@/lib/market";

import { ExpenseCategoryChart } from "@/components/dashboard/expense-chart";
import { CategoryManagement } from "@/components/dashboard/category-management";
// ... imports

export default function FinancePage() {
    const queryClient = useQueryClient();
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);

    // Filter State
    const [filterDate, setFilterDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const [year, month] = filterDate.split('-').map(Number);

    // --- Data Fetching ---

    // Accounts Query
    const { data: accounts } = useQuery({
        queryKey: ["accounts"],
        queryFn: getAccounts
    });


    // Calculate start/end date for the selected month
    const startDate = `${filterDate}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data: transactions, refetch: refetchTransactions } = useQuery({
        queryKey: ["transactions", filterDate],
        queryFn: () => getTransactions({
            start_date: startDate,
            end_date: endDate,
            limit: 100
        })
    });

    // Summary Query
    const { data: summary, refetch: refetchSummary } = useQuery({
        queryKey: ["summary"],
        queryFn: getFinanceDashboardSummary
    });

    // --- Mutations ---
    const deleteTxMutation = useMutation({
        mutationFn: deleteTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            refetchSummary();
        }
    });

    // Account Creation State
    const [accForm, setAccForm] = useState<any>({
        name: "",
        type: "CHECKING",
        balance: 0,
        color: "#000000"
    });

    const createAccountMutation = useMutation({
        mutationFn: createAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            refetchSummary();
            setAccForm({ name: "", type: "CHECKING", balance: 0, color: "#000000" });
        }
    });

    const handleAccSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createAccountMutation.mutate({
            ...accForm,
            balance: parseFloat(accForm.balance)
        });
    };

    // --- Transaction Modal Logic ---
    const { data: categories } = useQuery({
        queryKey: ["categories"],
        queryFn: () => getCategories()
    });

    // Transaction Creation State
    const [txForm, setTxForm] = useState<any>({
        description: "",
        amount: 0,
        type: TransactionType.EXPENSE,
        category_id: "",
        account_id: "",
        date: new Date().toISOString().split('T')[0],
        is_paid: true
    });

    const createTxMutation = useMutation({
        mutationFn: createTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["summary"] });
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            refetchSummary();
            refetchTransactions();
            setIsTxModalOpen(false);
            setTxForm({
                description: "",
                amount: 0,
                type: TransactionType.EXPENSE,
                category_id: "",
                account_id: "",
                date: new Date().toISOString().split('T')[0],
                is_paid: true
            });
        }
    });

    const handleTxSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createTxMutation.mutate({
            ...txForm,
            amount: parseFloat(txForm.amount),
            category_id: txForm.category_id ? parseInt(txForm.category_id) : undefined,
            account_id: txForm.account_id ? parseInt(txForm.account_id) : 0
        });
    };

    return (
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
                    <Wallet className="w-8 h-8 text-emerald-600" />
                    <h1 className="text-3xl font-bold text-gray-900">
                        Gestão Financeira
                    </h1>
                </div>
                <Button onClick={() => setIsTxModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Transação
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Left Column: Summary Cards */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">Resumo do Mês</h2>
                        <Input
                            type="month"
                            className="w-40"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                            <p className="text-sm text-gray-500 mb-1">Saldo Total</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {formatCurrency(summary?.total_balance || 0)}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                            <p className="text-sm text-gray-500 mb-1">Receitas</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(summary?.current_month.income || 0)}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
                            <p className="text-sm text-gray-500 mb-1">Despesas</p>
                            <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(summary?.current_month.expense || 0)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Expense Chart */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Despesas por Categoria</h3>
                    <ExpenseCategoryChart month={month} year={year} />
                </div>
            </div>

            <Tabs defaultValue="transactions" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="transactions">Transações</TabsTrigger>
                    <TabsTrigger value="categories">Categorias</TabsTrigger>
                    <TabsTrigger value="accounts">Contas</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions">
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Data</th>
                                    <th className="px-6 py-3">Descrição</th>
                                    <th className="px-6 py-3">Categoria</th>
                                    <th className="px-6 py-3">Conta</th>
                                    <th className="px-6 py-3 text-right">Valor</th>
                                    <th className="px-6 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transactions?.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            Nenhuma transação encontrada
                                        </td>
                                    </tr>
                                )}
                                {transactions?.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            {new Date(tx.date).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {tx.description || "-"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {tx.category_name || "Geral"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {tx.account_name}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-medium ${tx.type === "INCOME" ? "text-green-600" : "text-red-600"
                                            }`}>
                                            {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => deleteTxMutation.mutate(tx.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                <TabsContent value="categories">
                    <CategoryManagement />
                </TabsContent>

                <TabsContent value="accounts">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* List Accounts */}
                        <div className="space-y-4">
                            {accounts?.map(acc => (
                                <div key={acc.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Landmark className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{acc.name}</p>
                                            <p className="text-xs text-gray-500">{acc.type}</p>
                                        </div>
                                    </div>
                                    <p className="font-bold text-gray-900">{formatCurrency(acc.balance)}</p>
                                </div>
                            ))}
                        </div>

                        {/* Create Account Form */}
                        <div className="bg-white p-6 rounded-xl shadow-sm">
                            <h3 className="text-lg font-semibold mb-4">Adicionar Nova Conta</h3>
                            <form onSubmit={handleAccSubmit} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Nome da Conta</label>
                                    <Input
                                        required
                                        placeholder="Ex: Nubank, Itaú, Carteira"
                                        value={accForm.name}
                                        onChange={e => setAccForm({ ...accForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Tipo</label>
                                        <Select
                                            value={accForm.type}
                                            onValueChange={(v) => setAccForm({ ...accForm, type: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CHECKING">Corrente</SelectItem>
                                                <SelectItem value="SAVINGS">Poupança</SelectItem>
                                                <SelectItem value="WALLET">Carteira</SelectItem>
                                                <SelectItem value="INVESTMENT">Investimento</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Saldo Inicial</label>
                                        <Input
                                            type="number"
                                            value={accForm.balance}
                                            onChange={e => setAccForm({ ...accForm, balance: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <Button type="submit" disabled={createAccountMutation.isPending} className="w-full">
                                    {createAccountMutation.isPending ? "Criando..." : "Criar Conta"}
                                </Button>
                            </form>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* New Transaction Modal */}
            <Dialog open={isTxModalOpen} onOpenChange={setIsTxModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Transação</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleTxSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Tipo</label>
                                <Select
                                    value={txForm.type}
                                    onValueChange={(v) => setTxForm({ ...txForm, type: v as TransactionType })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EXPENSE">Despesa</SelectItem>
                                        <SelectItem value="INCOME">Receita</SelectItem>
                                        <SelectItem value="TRANSFER">Transferência</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Data</label>
                                <Input
                                    type="date"
                                    value={txForm.date}
                                    onChange={e => setTxForm({ ...txForm, date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Descrição</label>
                            <Input
                                required
                                value={txForm.description}
                                onChange={e => setTxForm({ ...txForm, description: e.target.value })}
                                placeholder="Ex: Mercado, Salário"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Valor</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={txForm.amount}
                                    onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Conta</label>
                                <Select
                                    value={String(txForm.account_id || "")}
                                    onValueChange={(v) => setTxForm({ ...txForm, account_id: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts?.map(acc => (
                                            <SelectItem key={acc.id} value={String(acc.id)}>
                                                {acc.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Categoria</label>
                            <Select
                                value={String(txForm.category_id || "none")}
                                onValueChange={(v) => setTxForm({ ...txForm, category_id: v === "none" ? "" : v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione (Opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem Categoria</SelectItem>
                                    {categories?.filter(c => c.type === txForm.type).map(cat => (
                                        <SelectItem key={cat.id} value={String(cat.id)}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button type="submit" disabled={createTxMutation.isPending} className="w-full">
                            {createTxMutation.isPending ? "Salvando..." : "Salvar Transação"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
