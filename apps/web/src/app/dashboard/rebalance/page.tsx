"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
    PieChart,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    AlertCircle,
    Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateRebalancing, RebalanceResponse } from "@/lib/portfolio";
import { formatCurrency, formatPercent } from "@/lib/market";

export default function RebalancePage() {
    const [targets, setTargets] = useState<Record<string, number>>({
        "ACAO": 60,
        "FII": 40,
        "ETF": 0,
        "BDR": 0,
        "RENDA_FIXA": 0
    });

    const calculateMutation = useMutation({
        mutationFn: calculateRebalancing,
    });

    const handleTargetChange = (type: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setTargets(prev => ({
            ...prev,
            [type]: numValue
        }));
    };

    const totalTarget = Object.values(targets).reduce((a, b) => a + b, 0);
    const isValid = Math.abs(totalTarget - 100) < 0.1;

    const handleCalculate = () => {
        if (!isValid) return;
        calculateMutation.mutate({ targets });
    };

    const result = calculateMutation.data;

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="flex items-center space-x-3 mb-8">
                <Calculator className="w-8 h-8 text-primary-600" />
                <h1 className="text-3xl font-bold text-gray-900">Rebalanceamento Inteligente</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Configuration Panel */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center">
                            <PieChart className="w-5 h-5 mr-2 text-primary-600" />
                            Definir Metas (%)
                        </h2>

                        <div className="space-y-4">
                            {Object.entries(targets).map(([type, value]) => (
                                <div key={type}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {type.replace("_", " ")}
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            type="number"
                                            value={value}
                                            onChange={(e) => handleTargetChange(type, e.target.value)}
                                            className="text-right"
                                            min="0"
                                            max="100"
                                        />
                                        <span className="text-gray-500 w-4">%</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-medium text-gray-700">Total</span>
                                <span className={`font-bold ${isValid ? "text-green-600" : "text-red-600"}`}>
                                    {totalTarget.toFixed(1)}%
                                </span>
                            </div>

                            {!isValid && (
                                <p className="text-xs text-red-500 mb-4 flex items-center">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    O total deve ser 100%
                                </p>
                            )}

                            <Button
                                className="w-full"
                                onClick={handleCalculate}
                                disabled={!isValid || calculateMutation.isPending}
                            >
                                {calculateMutation.isPending ? "Calculando..." : "Calcular Aportes"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="md:col-span-2">
                    {result ? (
                        <div className="space-y-6">
                            {/* Portfolio Value Summary included in calculation context usually, but here we show actions */}
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h2 className="text-xl font-semibold mb-6 flex items-center">
                                    <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
                                    Plano de Ajuste
                                </h2>

                                <div className="overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3">Tipo</th>
                                                <th className="px-4 py-3 text-right">Atual</th>
                                                <th className="px-4 py-3 text-right">Meta</th>
                                                <th className="px-4 py-3 text-right">Diferença</th>
                                                <th className="px-4 py-3 text-center">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.actions.map((action) => (
                                                <tr key={action.type} className="border-b border-gray-50 hover:bg-gray-50">
                                                    <td className="px-4 py-4 font-medium text-gray-900">
                                                        {action.type}
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <div>{formatPercent(action.current_percentage)}</div>
                                                        <div className="text-xs text-gray-500">{formatCurrency(action.current_value)}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-medium">
                                                        <div>{formatPercent(action.target_percentage)}</div>
                                                        <div className="text-xs text-gray-500">{formatCurrency(action.target_value)}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <span className={action.difference > 0 ? "text-green-600" : "text-red-600"}>
                                                            {formatCurrency(Math.abs(action.difference))}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                            ${action.action === "COMPRAR" ? "bg-green-100 text-green-800" :
                                                                action.action === "VENDER" ? "bg-red-100 text-red-800" :
                                                                    "bg-gray-100 text-gray-800"}`}>
                                                            {action.action === "COMPRAR" && <TrendingUp className="w-3 h-3 mr-1" />}
                                                            {action.action === "VENDER" && <TrendingDown className="w-3 h-3 mr-1" />}
                                                            {action.action}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-xl border-dashed border-2 border-gray-200 p-12 text-gray-400">
                            <Calculator className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg">Defina suas metas e clique em calcular</p>
                            <p className="text-sm mt-2">Veja onde você precisa investir para equilibrar sua carteira</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
