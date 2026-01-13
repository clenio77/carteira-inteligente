"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPortfolioHistory } from "@/lib/analytics";

const ranges = [
    { label: "1D", value: "1d" },
    { label: "1M", value: "1mo" },
    { label: "6M", value: "6mo" },
    { label: "1A", value: "1y" },
    { label: "YTD", value: "ytd" },
];

export function PortfolioHistoryChart() {
    const [range, setRange] = useState("1mo");

    const { data: history, isLoading } = useQuery({
        queryKey: ["portfolioHistory", range],
        queryFn: () => getPortfolioHistory(range),
    });

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            compactDisplay: "short",
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            if (range === "1d") return format(date, "HH:mm");
            if (range === "1mo") return format(date, "dd/MM");
            return format(date, "MMM yy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 md:mb-0">
                    Evolução do Patrimônio
                </h3>
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                    {ranges.map((r) => (
                        <Button
                            key={r.value}
                            variant={range === r.value ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setRange(r.value)}
                            className="px-3 h-8 text-xs font-medium"
                        >
                            {r.label}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="h-[300px] w-full">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                    </div>
                ) : !history || history.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                        Sem dados suficientes para o período.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDate}
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                tickFormatter={formatCurrency}
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                                axisLine={false}
                                tickLine={false}
                                width={80}
                            />
                            <Tooltip
                                formatter={(value: number) => [
                                    new Intl.NumberFormat("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    }).format(value),
                                    "Valor",
                                ]}
                                labelFormatter={(label) => {
                                    try {
                                        return format(new Date(label), "dd 'de' MMMM, yyyy", { locale: ptBR });
                                    } catch {
                                        return label;
                                    }
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#2563eb"
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
