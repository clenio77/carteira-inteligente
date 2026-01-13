"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus,
    Trash2,
    Tag,
    Briefcase,
    Coffee,
    ShoppingCart,
    Home,
    Car,
    Plane,
    Heart,
    Smartphone,
    CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Category,
    CategoryCreate,
    getCategories,
    createCategory,
    deleteCategory,
    TransactionType
} from "@/lib/personal-finance";

// Map of available icons for selection
const ICON_MAP: Record<string, React.ElementType> = {
    "default": Tag,
    "briefcase": Briefcase,
    "coffee": Coffee,
    "shopping-cart": ShoppingCart,
    "home": Home,
    "car": Car,
    "plane": Plane,
    "heart": Heart,
    "smartphone": Smartphone,
    "credit-card": CreditCard,
};

// Available icons for the dropdown
const AVAILABLE_ICONS = Object.keys(ICON_MAP).filter(k => k !== 'default');

export function CategoryManagement() {
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newCategory, setNewCategory] = useState<CategoryCreate>({
        name: "",
        type: TransactionType.EXPENSE,
        icon: "tag"
    });

    // Fetch Categories
    const { data: categories, isLoading } = useQuery({
        queryKey: ["categories"],
        queryFn: () => getCategories()
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            setIsCreateOpen(false);
            setNewCategory({ name: "", type: TransactionType.EXPENSE, icon: "tag" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
        },
        onError: (error: any) => {
            alert(error.response?.data?.detail || "Erro ao excluir categoria");
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(newCategory);
    };

    const getIcon = (iconName?: string) => {
        const Icon = ICON_MAP[iconName || "default"] || Tag;
        return <Icon className="w-5 h-5" />;
    };

    if (isLoading) return <div>Carregando categorias...</div>;

    // Filter categories by type
    const expenseCategories = categories?.filter(c => c.type === "EXPENSE") || [];
    const incomeCategories = categories?.filter(c => c.type === "INCOME") || [];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Gerenciar Categorias</h2>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Nova Categoria
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nova Categoria</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Nome</label>
                                <Input
                                    required
                                    value={newCategory.name}
                                    onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                                    placeholder="Ex: Alimentação, Lazer"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Tipo</label>
                                    <Select
                                        value={newCategory.type}
                                        onValueChange={(v) => setNewCategory({ ...newCategory, type: v as TransactionType })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EXPENSE">Despesa</SelectItem>
                                            <SelectItem value="INCOME">Receita</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Ícone (Visual)</label>
                                    <Select
                                        value={newCategory.icon}
                                        onValueChange={(v) => setNewCategory({ ...newCategory, icon: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="tag">Padrão (Tag)</SelectItem>
                                            <SelectItem value="shopping-cart">Compras</SelectItem>
                                            <SelectItem value="home">Casa</SelectItem>
                                            <SelectItem value="car">Carro</SelectItem>
                                            <SelectItem value="coffee">Lanches</SelectItem>
                                            <SelectItem value="briefcase">Trabalho</SelectItem>
                                            <SelectItem value="heart">Saúde</SelectItem>
                                            <SelectItem value="plane">Viagem</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                                {createMutation.isPending ? "Criando..." : "Criar Categoria"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Expense Column */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
                    <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center">
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Despesas
                    </h3>
                    <div className="space-y-2">
                        {expenseCategories.map(cat => (
                            <div key={cat.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group hover:bg-red-50 transition-colors">
                                <div className="flex items-center space-x-3">
                                    <div className="text-gray-500 group-hover:text-red-600">
                                        {getIcon(cat.icon)}
                                    </div>
                                    <span className="font-medium text-gray-700">{cat.name}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-700 hover:bg-red-100"
                                    onClick={() => {
                                        if (confirm(`Excluir categoria "${cat.name}"?`)) {
                                            deleteMutation.mutate(cat.id);
                                        }
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {expenseCategories.length === 0 && <p className="text-gray-500 text-sm">Nenhuma categoria encontrada.</p>}
                    </div>
                </div>

                {/* Income Column */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100">
                    <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center">
                        <Briefcase className="w-5 h-5 mr-2" />
                        Receitas
                    </h3>
                    <div className="space-y-2">
                        {incomeCategories.map(cat => (
                            <div key={cat.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group hover:bg-green-50 transition-colors">
                                <div className="flex items-center space-x-3">
                                    <div className="text-gray-500 group-hover:text-green-600">
                                        {getIcon(cat.icon)}
                                    </div>
                                    <span className="font-medium text-gray-700">{cat.name}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-700 hover:bg-red-100"
                                    onClick={() => {
                                        if (confirm(`Excluir categoria "${cat.name}"?`)) {
                                            deleteMutation.mutate(cat.id);
                                        }
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {incomeCategories.length === 0 && <p className="text-gray-500 text-sm">Nenhuma categoria encontrada.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
