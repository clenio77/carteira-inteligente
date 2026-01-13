"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAuthenticated } from "@/lib/auth";
import {
    listFixedIncomeInvestments,
    addFixedIncomeInvestment,
    deleteFixedIncomeInvestment,
    updateFixedIncomeValues,
    getFixedIncomeTypes,
    formatCurrency,
    formatPercent,
    formatDate,
    getTypeLabel,
    getTypeColor,
    FixedIncomeInvestment,
    AddFixedIncomeRequest,
} from "@/lib/fixed-income";
import {
    Loader2,
    AlertCircle,
    Plus,
    RefreshCw,
    Trash2,
    TrendingUp,
    TrendingDown,
    Landmark,
    Calendar,
    Percent,
    CheckCircle,
    X,
    ArrowLeft,
    PiggyBank,
    Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FixedIncomePage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [showAddForm, setShowAddForm] = useState(false);
    const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push("/login");
        }
    }, [router]);

    // Fetch investments
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["fixedIncomeInvestments"],
        queryFn: () => listFixedIncomeInvestments(true),
    });

    // Fetch types for form
    const { data: typesData } = useQuery({
        queryKey: ["fixedIncomeTypes"],
        queryFn: getFixedIncomeTypes,
    });

    // Update values mutation
    const updateMutation = useMutation({
        mutationFn: () => updateFixedIncomeValues(),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["fixedIncomeInvestments"] });
            setUpdateMessage({ type: 'success', text: data.message });
            setTimeout(() => setUpdateMessage(null), 5000);
        },
        onError: () => {
            setUpdateMessage({ type: 'error', text: 'Erro ao atualizar valores' });
            setTimeout(() => setUpdateMessage(null), 5000);
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: deleteFixedIncomeInvestment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fixedIncomeInvestments"] });
            setUpdateMessage({ type: 'success', text: 'Investimento removido' });
            setTimeout(() => setUpdateMessage(null), 3000);
        },
    });

    // Add mutation
    const addMutation = useMutation({
        mutationFn: addFixedIncomeInvestment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fixedIncomeInvestments"] });
            setShowAddForm(false);
            setUpdateMessage({ type: 'success', text: 'Investimento adicionado!' });
            setTimeout(() => setUpdateMessage(null), 3000);
        },
        onError: (error: any) => {
            setUpdateMessage({
                type: 'error',
                text: error.response?.data?.detail || 'Erro ao adicionar'
            });
            setTimeout(() => setUpdateMessage(null), 5000);
        },
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Carregando investimentos...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-red-900 mb-2">Erro</h2>
                        <p className="text-red-700 mb-4">Não foi possível carregar os investimentos.</p>
                        <Button onClick={() => refetch()}>Tentar Novamente</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar
                            </Button>
                        </Link>
                        <Landmark className="w-8 h-8 text-yellow-600" />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Renda Fixa</h1>
                            <p className="text-gray-600">Tesouro Direto, CDB, LCI, LCA e mais</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => updateMutation.mutate()}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Atualizar Valores
                        </Button>
                        <Button onClick={() => setShowAddForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar
                        </Button>
                    </div>
                </div>

                {/* Update Message */}
                {updateMessage && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${updateMessage.type === 'success'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                        {updateMessage.type === 'success' ? (
                            <CheckCircle className="w-5 h-5" />
                        ) : (
                            <AlertCircle className="w-5 h-5" />
                        )}
                        <span className="font-medium">{updateMessage.text}</span>
                    </div>
                )}

                {/* Summary Cards */}
                {data && data.investments.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl shadow-sm p-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-500">Total Investido</span>
                                <PiggyBank className="w-5 h-5 text-blue-500" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {formatCurrency(data.total_invested)}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-500">Valor Atual</span>
                                <Landmark className="w-5 h-5 text-green-500" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {formatCurrency(data.total_current_value)}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-500">Lucro/Prejuízo</span>
                                {data.total_profit_loss >= 0 ? (
                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                ) : (
                                    <TrendingDown className="w-5 h-5 text-red-500" />
                                )}
                            </div>
                            <p className={`text-2xl font-bold ${data.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {formatCurrency(data.total_profit_loss)}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-500">Rentabilidade</span>
                                <Percent className="w-5 h-5 text-purple-500" />
                            </div>
                            <p className={`text-2xl font-bold ${data.total_profit_loss_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {formatPercent(data.total_profit_loss_percentage)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Investments List */}
                {data && data.investments.length > 0 ? (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Investimento
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Tipo / Taxa
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                            Investido
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                            Valor Atual
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                            Rentabilidade
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                            Vencimento
                                        </th>
                                        <th className="px-6 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {data.investments.map((inv) => (
                                        <InvestmentRow
                                            key={inv.id}
                                            investment={inv}
                                            onDelete={() => deleteMutation.mutate(inv.id)}
                                            isDeleting={deleteMutation.isPending}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <Landmark className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">
                            Nenhum investimento de renda fixa
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Adicione seus títulos do Tesouro Direto, CDBs, LCIs e outros.
                        </p>
                        <Button onClick={() => setShowAddForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Investimento
                        </Button>
                    </div>
                )}

                {/* Add Form Modal */}
                {showAddForm && typesData && (
                    <AddInvestmentModal
                        types={typesData.types}
                        indexers={typesData.indexers}
                        onClose={() => setShowAddForm(false)}
                        onAdd={(data) => addMutation.mutate(data)}
                        isLoading={addMutation.isPending}
                    />
                )}
            </div>
        </div>
    );
}

// Investment Row Component
function InvestmentRow({
    investment,
    onDelete,
    isDeleting
}: {
    investment: FixedIncomeInvestment;
    onDelete: () => void;
    isDeleting: boolean;
}) {
    const isProfitable = investment.profit_loss >= 0;

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4">
                <div>
                    <p className="font-medium text-gray-900">{investment.name}</p>
                    {investment.issuer && (
                        <p className="text-sm text-gray-500">{investment.issuer}</p>
                    )}
                </div>
            </td>
            <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(investment.type)}`}>
                    {getTypeLabel(investment.type)}
                </span>
                <p className="text-sm text-gray-600 mt-1">{investment.rate_description}</p>
            </td>
            <td className="px-6 py-4 text-right text-sm text-gray-900">
                {formatCurrency(investment.invested_amount)}
            </td>
            <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                {formatCurrency(investment.current_value)}
            </td>
            <td className="px-6 py-4 text-right">
                <div className={`text-sm font-medium flex items-center justify-end ${isProfitable ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {isProfitable ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    {formatCurrency(investment.profit_loss)}
                </div>
                <div className={`text-xs ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(investment.profit_loss_percentage)}
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                {investment.maturity_date ? (
                    <div>
                        <p className="text-sm text-gray-900">{formatDate(investment.maturity_date)}</p>
                        <p className="text-xs text-gray-500 flex items-center justify-end">
                            <Clock className="w-3 h-3 mr-1" />
                            {investment.days_to_maturity} dias
                        </p>
                    </div>
                ) : (
                    <span className="text-gray-400">—</span>
                )}
            </td>
            <td className="px-6 py-4 text-right">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </td>
        </tr>
    );
}

// Add Investment Modal
function AddInvestmentModal({
    types,
    indexers,
    onClose,
    onAdd,
    isLoading,
}: {
    types: { value: string; label: string; description: string }[];
    indexers: { value: string; label: string; description: string }[];
    onClose: () => void;
    onAdd: (data: AddFixedIncomeRequest) => void;
    isLoading: boolean;
}) {
    const [form, setForm] = useState({
        name: '',
        type: 'TESOURO_SELIC',
        issuer: '',
        invested_amount: '',
        purchase_date: new Date().toISOString().split('T')[0],
        maturity_date: '',
        indexer: 'SELIC',
        rate: '',
        is_percentage_of_indexer: true,
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({
            name: form.name,
            type: form.type,
            issuer: form.issuer || undefined,
            invested_amount: parseFloat(form.invested_amount),
            purchase_date: form.purchase_date,
            maturity_date: form.maturity_date || undefined,
            indexer: form.indexer,
            rate: parseFloat(form.rate),
            is_percentage_of_indexer: form.is_percentage_of_indexer,
            notes: form.notes || undefined,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Adicionar Investimento</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Investimento</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Tesouro Selic 2029"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                        <select
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                            {types.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Issuer */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Emissor (opcional)</label>
                        <input
                            type="text"
                            placeholder="Ex: Banco Inter, Tesouro Nacional"
                            value={form.issuer}
                            onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor Investido (R$)</label>
                        <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            placeholder="10000.00"
                            value={form.invested_amount}
                            onChange={(e) => setForm({ ...form, invested_amount: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data da Compra</label>
                            <input
                                type="date"
                                required
                                value={form.purchase_date}
                                onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento (opcional)</label>
                            <input
                                type="date"
                                value={form.maturity_date}
                                onChange={(e) => setForm({ ...form, maturity_date: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {/* Rate */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Indexador</label>
                            <select
                                value={form.indexer}
                                onChange={(e) => setForm({ ...form, indexer: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                            >
                                {indexers.map((i) => (
                                    <option key={i.value} value={i.value}>{i.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Taxa (%)</label>
                            <input
                                type="number"
                                required
                                step="0.01"
                                placeholder="100 ou 5.5"
                                value={form.rate}
                                onChange={(e) => setForm({ ...form, rate: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {/* Rate Type */}
                    <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="rate_type"
                                checked={form.is_percentage_of_indexer}
                                onChange={() => setForm({ ...form, is_percentage_of_indexer: true })}
                                className="mr-2"
                            />
                            <span className="text-sm">% do indexador (ex: 110% CDI)</span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="rate_type"
                                checked={!form.is_percentage_of_indexer}
                                onChange={() => setForm({ ...form, is_percentage_of_indexer: false })}
                                className="mr-2"
                            />
                            <span className="text-sm">+ indexador (ex: IPCA+5%)</span>
                        </label>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                            placeholder="Anotações sobre este investimento..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading} className="flex-1">
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Adicionar
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
