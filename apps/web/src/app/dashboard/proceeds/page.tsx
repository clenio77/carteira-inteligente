"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/market";
import { getPortfolioAssets } from "@/lib/portfolio";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    Plus,
    Trash2,
    DollarSign,
    Calendar,
    TrendingUp,
    Loader2,
    RefreshCw,
    Download,
    Search,
    ChevronDown,
} from "lucide-react";

interface Proceed {
    id: number;
    ticker: string;
    asset_name: string;
    proceed_type: string;
    proceed_date: string;
    value_per_share: number;
    quantity: number;
    total_value: number;
    description?: string;
}

interface ProceedsData {
    proceeds: Proceed[];
    total_count: number;
    total_value: number;
    totals_by_type: Record<string, number>;
}

interface ProceedsSummary {
    by_month: { month: string; total: number; count: number }[];
    by_asset: { ticker: string; total: number; count: number }[];
    total: number;
    total_count: number;
}

interface PortfolioAsset {
    ticker: string;
    name: string;
    asset_type: string;
    quantity: number;
    average_price: number;
    current_price: number;
}

const PROCEED_TYPES = [
    { value: "DIVIDEND", label: "Dividendo" },
    { value: "JCP", label: "JCP" },
    { value: "RENDIMENTO", label: "Rendimento (FII)" },
    { value: "BONIFICACAO", label: "Bonificação" },
    { value: "DIREITO", label: "Direito de Subscrição" },
];

const TYPE_COLORS: Record<string, string> = {
    DIVIDEND: "bg-green-100 text-green-800",
    JCP: "bg-blue-100 text-blue-800",
    RENDIMENTO: "bg-purple-100 text-purple-800",
    BONIFICACAO: "bg-yellow-100 text-yellow-800",
    DIREITO: "bg-orange-100 text-orange-800",
};

export default function ProceedsPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [showAddForm, setShowAddForm] = useState(false);
    const [showAssetDropdown, setShowAssetDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAsset, setSelectedAsset] = useState<PortfolioAsset | null>(null);

    const [formData, setFormData] = useState({
        ticker: "",
        proceed_type: "DIVIDEND",
        proceed_date: new Date().toISOString().split("T")[0],
        value_per_share: "",
        quantity: "",
        description: "",
    });

    // Fetch portfolio assets for autocomplete
    const { data: portfolioAssets } = useQuery<PortfolioAsset[]>({
        queryKey: ["portfolioAssets"],
        queryFn: getPortfolioAssets,
    });

    // Filter assets based on search
    const filteredAssets = portfolioAssets?.filter(asset =>
        asset.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // Fetch proceeds
    const { data: proceedsData, isLoading } = useQuery<ProceedsData>({
        queryKey: ["proceeds"],
        queryFn: async () => {
            const response = await api.get("/portfolio/manage/proceeds");
            return response.data;
        },
    });

    // Fetch summary
    const { data: summary } = useQuery<ProceedsSummary>({
        queryKey: ["proceeds-summary"],
        queryFn: async () => {
            const response = await api.get("/portfolio/manage/proceeds/summary");
            return response.data;
        },
    });

    // Handle asset selection
    const handleSelectAsset = (asset: PortfolioAsset) => {
        setSelectedAsset(asset);
        setFormData({
            ...formData,
            ticker: asset.ticker,
            quantity: asset.quantity.toString(),
        });
        setSearchQuery(asset.ticker);
        setShowAssetDropdown(false);
    };

    // Add proceed mutation
    const addProceedMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const response = await api.post("/portfolio/manage/proceeds", {
                ticker: data.ticker.toUpperCase(),
                proceed_type: data.proceed_type,
                proceed_date: data.proceed_date,
                value_per_share: parseFloat(data.value_per_share),
                quantity: parseFloat(data.quantity),
                description: data.description || null,
            });
            return response.data;
        },
        onSuccess: () => {
            alert("Provento cadastrado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["proceeds"] });
            queryClient.invalidateQueries({ queryKey: ["proceeds-summary"] });
            setShowAddForm(false);
            setSelectedAsset(null);
            setSearchQuery("");
            setFormData({
                ticker: "",
                proceed_type: "DIVIDEND",
                proceed_date: new Date().toISOString().split("T")[0],
                value_per_share: "",
                quantity: "",
                description: "",
            });
        },
        onError: (error: any) => {
            alert(error.response?.data?.detail || "Erro ao cadastrar provento");
        },
    });

    // Delete proceed mutation
    const deleteProceedMutation = useMutation({
        mutationFn: async (proceedId: number) => {
            await api.delete(`/portfolio/manage/proceeds/${proceedId}`);
        },
        onSuccess: () => {
            alert("Provento excluído!");
            queryClient.invalidateQueries({ queryKey: ["proceeds"] });
            queryClient.invalidateQueries({ queryKey: ["proceeds-summary"] });
        },
        onError: () => {
            alert("Erro ao excluir provento");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addProceedMutation.mutate(formData);
    };

    const calculatedTotal = formData.value_per_share && formData.quantity
        ? parseFloat(formData.value_per_share) * parseFloat(formData.quantity)
        : 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-6">
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
                            <h1 className="text-2xl font-bold text-gray-900">Proventos</h1>
                            <p className="text-gray-500">Gerencie seus dividendos, JCP e rendimentos</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setShowAddForm(!showAddForm)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Provento
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/portfolio/manage/export/proceeds`, '_blank');
                            }}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Exportar CSV
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Recebido</p>
                                <p className="text-xl font-bold text-green-600">
                                    {formatCurrency(proceedsData?.total_value || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Dividendos</p>
                                <p className="text-xl font-bold text-blue-600">
                                    {formatCurrency(proceedsData?.totals_by_type?.DIVIDEND || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <RefreshCw className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Rendimentos FII</p>
                                <p className="text-xl font-bold text-purple-600">
                                    {formatCurrency(proceedsData?.totals_by_type?.RENDIMENTO || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gray-100 rounded-lg">
                                <Calendar className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Pagamentos</p>
                                <p className="text-xl font-bold text-gray-700">
                                    {proceedsData?.total_count || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Proceed Form */}
                {showAddForm && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Cadastrar Novo Provento
                        </h3>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Asset Selector with Autocomplete */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ativo da Carteira
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setShowAssetDropdown(true);
                                            setFormData({ ...formData, ticker: e.target.value });
                                        }}
                                        onFocus={() => setShowAssetDropdown(true)}
                                        placeholder="Buscar ativo..."
                                        className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                </div>

                                {/* Dropdown with portfolio assets */}
                                {showAssetDropdown && filteredAssets.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[200px] overflow-y-auto z-50">
                                        {filteredAssets.map((asset) => (
                                            <button
                                                key={asset.ticker}
                                                type="button"
                                                onClick={() => handleSelectAsset(asset)}
                                                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                                            >
                                                <div className="text-left">
                                                    <p className="font-semibold text-gray-900">{asset.ticker}</p>
                                                    <p className="text-xs text-gray-500">{asset.name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {asset.quantity} cotas
                                                    </p>
                                                    <p className="text-xs text-gray-500">{asset.asset_type}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Show selected asset info */}
                                {selectedAsset && (
                                    <p className="text-xs text-green-600 mt-1">
                                        ✓ {selectedAsset.quantity} cotas de {selectedAsset.ticker}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo
                                </label>
                                <select
                                    value={formData.proceed_type}
                                    onChange={(e) => setFormData({ ...formData, proceed_type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    {PROCEED_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Data de Pagamento
                                </label>
                                <input
                                    type="date"
                                    value={formData.proceed_date}
                                    onChange={(e) => setFormData({ ...formData, proceed_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Valor por Ação (R$)
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={formData.value_per_share}
                                    onChange={(e) => setFormData({ ...formData, value_per_share: e.target.value })}
                                    placeholder="0.50"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantidade
                                </label>
                                <input
                                    type="number"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    placeholder="100"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                                    required
                                />
                                {selectedAsset && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Preenchido automaticamente
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Total Calculado
                                </label>
                                <div className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-lg font-semibold text-green-600">
                                    {formatCurrency(calculatedTotal)}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descrição (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Ex: Dividendo referente ao 4T25"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex items-end gap-2">
                                <Button
                                    type="submit"
                                    className="flex-1"
                                    disabled={addProceedMutation.isPending}
                                >
                                    {addProceedMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Plus className="w-4 h-4 mr-2" />
                                    )}
                                    Cadastrar
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setSelectedAsset(null);
                                        setSearchQuery("");
                                    }}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Proceeds List */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Histórico de Proventos
                        </h3>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : !proceedsData?.proceeds?.length ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <DollarSign className="w-12 h-12 mb-2 opacity-20" />
                            <p>Nenhum provento cadastrado</p>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => setShowAddForm(true)}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Cadastrar Primeiro Provento
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ativo
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tipo
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Data
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Valor/Ação
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Qtd
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Total
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {proceedsData.proceeds.map((proceed) => (
                                        <tr key={proceed.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{proceed.ticker}</div>
                                                <div className="text-sm text-gray-500">{proceed.asset_name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[proceed.proceed_type] || "bg-gray-100 text-gray-800"}`}>
                                                    {PROCEED_TYPES.find(t => t.value === proceed.proceed_type)?.label || proceed.proceed_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(proceed.proceed_date).toLocaleDateString("pt-BR")}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                {formatCurrency(proceed.value_per_share)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                {proceed.quantity}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                                                {formatCurrency(proceed.total_value)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (confirm("Excluir este provento?")) {
                                                            deleteProceedMutation.mutate(proceed.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Top Assets by Proceeds */}
                {summary?.by_asset && summary.by_asset.length > 0 && (
                    <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Top Pagadores
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {summary.by_asset.slice(0, 5).map((asset) => (
                                <div key={asset.ticker} className="text-center p-4 bg-gray-50 rounded-lg">
                                    <p className="font-medium text-gray-900">{asset.ticker}</p>
                                    <p className="text-lg font-bold text-green-600">{formatCurrency(asset.total)}</p>
                                    <p className="text-xs text-gray-500">{asset.count} pagamentos</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
