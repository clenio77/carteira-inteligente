"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/market";
import { getDividendHistory } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Loader2 } from "lucide-react";

const RANGES = [
    { label: "12 Meses", value: "12mo" },
    { label: "Ano Atual", value: "ytd" },
    { label: "Tudo", value: "all" },
];

export function DividendChart() {
    const [range, setRange] = useState("12mo");

    const { data: history, isLoading } = useQuery({
        queryKey: ["dividendHistory", range],
        queryFn: () => getDividendHistory(range),
    });

    const totalDividends = history?.reduce((acc, curr) => acc + curr.value, 0) || 0;

    // Format date for axis
    const formatDate = (dateStr: string) => {
        const [year, month] = dateStr.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    };

    // Format tooltip label
    const formatTooltipLabel = (dateStr: string) => {
        const [year, month] = dateStr.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Coins className="w-5 h-5 text-yellow-600" />
                            Proventos Recebidos
                        </CardTitle>
                        <CardDescription>
                            Evolução mensal de dividendos e JCP
                        </CardDescription>
                    </div>
                    <div className="flex bg-gray-100 rounded-lg p-1 self-start md:self-center">
                        {RANGES.map((r) => (
                            <button
                                key={r.value}
                                onClick={() => setRange(r.value)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${range === r.value
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-900"
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-6">
                    <p className="text-sm text-gray-500">Total no período</p>
                    <p className="text-3xl font-bold text-gray-900">{isLoading ? "-" : formatCurrency(totalDividends)}</p>
                </div>

                <div className="h-[300px] w-full">
                    {isLoading ? (
                        <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-lg">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                        </div>
                    ) : !history || history.length === 0 ? (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 rounded-lg text-gray-500">
                            <Coins className="w-10 h-10 mb-2 opacity-20" />
                            <p>Nenhum provento registrado no período</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={formatDate}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: "#6B7280" }}
                                    dy={10}
                                    minTickGap={30}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: "#6B7280" }}
                                    tickFormatter={(val) => `R$ ${val}`} // Simplify for axis
                                />
                                <Tooltip
                                    cursor={{ fill: "#F3F4F6" }}
                                    contentStyle={{
                                        backgroundColor: "#fff",
                                        borderRadius: "8px",
                                        border: "1px solid #E5E7EB",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                    }}
                                    labelFormatter={formatTooltipLabel}
                                    formatter={(value: number) => [
                                        <span key="val" className="font-bold text-gray-900">{formatCurrency(value)}</span>,
                                        "Valor Recebido"
                                    ]}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="#16A34A" // Green like money
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={50}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
