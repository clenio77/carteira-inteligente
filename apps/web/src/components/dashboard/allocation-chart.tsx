"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatCurrency } from "@/lib/market";
import { PieChart as PieChartIcon } from "lucide-react";

// Cores por tipo de ativo
const TYPE_COLORS: Record<string, string> = {
    "ACAO": "#3b82f6",      // Azul
    "FII": "#10b981",       // Verde
    "RENDA_FIXA": "#f59e0b", // Amarelo
    "ETF": "#8b5cf6",       // Roxo
    "BDR": "#06b6d4",       // Cyan
    "CRYPTO": "#f97316",    // Laranja
};

const TYPE_LABELS: Record<string, string> = {
    "ACAO": "Ações",
    "FII": "FIIs",
    "RENDA_FIXA": "Renda Fixa",
    "ETF": "ETFs",
    "BDR": "BDRs",
    "CRYPTO": "Cripto",
};

interface AllocationItem {
    type: string;
    value: number;
    percentage: number;
}

interface AllocationChartProps {
    data: AllocationItem[];
    totalValue?: number;
}

export function AllocationChart({ data, totalValue }: AllocationChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <PieChartIcon className="w-12 h-12 mb-2 opacity-20" />
                <p>Sem dados de alocação</p>
            </div>
        );
    }

    // Preparar dados para o gráfico
    const chartData = data.map(item => ({
        name: TYPE_LABELS[item.type] || item.type,
        value: item.value,
        percentage: item.percentage,
        fill: TYPE_COLORS[item.type] || "#6b7280"
    }));

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                        labelLine={false}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                            formatCurrency(value),
                            `${props.payload.percentage.toFixed(1)}%`
                        ]}
                        contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            backgroundColor: 'white'
                        }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value, entry: any) => (
                            <span style={{ color: entry.color }}>{value}</span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
            {totalValue && (
                <div className="text-center -mt-4">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalValue)}</p>
                </div>
            )}
        </div>
    );
}
