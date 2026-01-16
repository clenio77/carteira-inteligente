"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/market";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    FileText,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Lightbulb,
    Target,
    DollarSign,
    Loader2,
    RefreshCw,
    Download,
    Printer,
    Calendar,
    PieChart,
    Activity,
} from "lucide-react";

interface PortfolioReport {
    generated_at: string;
    total_invested: number;
    total_value: number;
    total_profit_loss: number;
    total_profit_loss_pct: number;
    assets_count: number;
    macro_context: {
        selic?: number;
        cdi?: number;
        ipca_12m?: number;
        dolar?: number;
        resumo?: string;
    };
    assets: {
        ticker: string;
        name: string;
        quantity: number;
        average_price: number;
        current_price: number;
        profit_loss: number;
        profit_loss_pct: number;
        weight_pct: number;
        price_earnings?: number;
        dividend_yield?: number;
    }[];
    executive_summary: string;
    risk_analysis: string;
    opportunities: string;
    recommendations: string;
    dividend_projection: string;
}

interface ReportResponse {
    success: boolean;
    message: string;
    report: PortfolioReport | null;
}

export default function PortfolioReportPage() {
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);

    const { data, isLoading, error, refetch } = useQuery<ReportResponse>({
        queryKey: ["portfolioReport"],
        queryFn: async () => {
            const response = await api.get("/portfolio/report");
            return response.data;
        },
        staleTime: 10 * 60 * 1000, // 10 minutos cache
        enabled: false, // Não buscar automaticamente
    });

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        try {
            await refetch();
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const report = data?.report;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10 print:hidden">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Voltar
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary-600" />
                                    Relatório Gerencial
                                </h1>
                                <p className="text-sm text-gray-500">
                                    Análise completa da sua carteira com IA
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {report && (
                                <Button variant="outline" size="sm" onClick={handlePrint}>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimir
                                </Button>
                            )}
                            <Button
                                onClick={handleGenerateReport}
                                disabled={isGenerating || isLoading}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Gerando...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        {report ? "Atualizar" : "Gerar Relatório"}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Initial State */}
                {!report && !isGenerating && !isLoading && (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            Relatório Gerencial da Carteira
                        </h2>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            Gere um relatório completo com análise de cada ativo,
                            riscos, oportunidades e recomendações personalizadas usando IA.
                        </p>
                        <Button size="lg" onClick={handleGenerateReport}>
                            <FileText className="w-5 h-5 mr-2" />
                            Gerar Relatório
                        </Button>
                    </div>
                )}

                {/* Loading State */}
                {(isGenerating || isLoading) && (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <Loader2 className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-spin" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            Gerando Relatório...
                        </h2>
                        <p className="text-gray-500">
                            Analisando sua carteira com inteligência artificial.
                            <br />
                            Isso pode levar alguns segundos.
                        </p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-lg font-semibold text-red-800 mb-2">
                            Erro ao gerar relatório
                        </h2>
                        <p className="text-red-600">
                            Não foi possível gerar o relatório. Tente novamente.
                        </p>
                    </div>
                )}

                {/* Report Content */}
                {report && !isGenerating && (
                    <div className="space-y-6 print:space-y-4">
                        {/* Header Info */}
                        <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:border">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Calendar className="w-4 h-4" />
                                    Gerado em: {new Date(report.generated_at).toLocaleString('pt-BR')}
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500">Total Investido</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {formatCurrency(report.total_invested)}
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500">Valor Atual</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {formatCurrency(report.total_value)}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-lg ${report.total_profit_loss >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                    <p className="text-sm text-gray-500">Resultado</p>
                                    <p className={`text-xl font-bold ${report.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {report.total_profit_loss >= 0 ? '+' : ''}{formatCurrency(report.total_profit_loss)}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-lg ${report.total_profit_loss_pct >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                    <p className="text-sm text-gray-500">Rentabilidade</p>
                                    <p className={`text-xl font-bold flex items-center gap-1 ${report.total_profit_loss_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {report.total_profit_loss_pct >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                        {report.total_profit_loss_pct >= 0 ? '+' : ''}{report.total_profit_loss_pct.toFixed(1)}%
                                    </p>
                                </div>
                            </div>

                            {/* Macro Context */}
                            {report.macro_context && report.macro_context.resumo && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <p className="text-sm text-blue-800">
                                        <strong>Cenário Macro:</strong> {report.macro_context.resumo}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Executive Summary */}
                        {report.executive_summary && (
                            <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:border">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary-600" />
                                    Resumo Executivo
                                </h2>
                                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                                    {report.executive_summary}
                                </div>
                            </div>
                        )}

                        {/* Assets Table */}
                        {report.assets && report.assets.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:border overflow-x-auto">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <PieChart className="w-5 h-5 text-primary-600" />
                                    Composição da Carteira
                                </h2>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="pb-2 font-medium">Ativo</th>
                                            <th className="pb-2 font-medium text-right">Qtd</th>
                                            <th className="pb-2 font-medium text-right">PM</th>
                                            <th className="pb-2 font-medium text-right">Atual</th>
                                            <th className="pb-2 font-medium text-right">Resultado</th>
                                            <th className="pb-2 font-medium text-right">Peso</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.assets.map((asset) => (
                                            <tr key={asset.ticker} className="border-b last:border-0">
                                                <td className="py-2">
                                                    <span className="font-medium">{asset.ticker}</span>
                                                    <br />
                                                    <span className="text-xs text-gray-500">{asset.name?.substring(0, 25)}</span>
                                                </td>
                                                <td className="py-2 text-right">{asset.quantity}</td>
                                                <td className="py-2 text-right">{formatCurrency(asset.average_price)}</td>
                                                <td className="py-2 text-right">{formatCurrency(asset.current_price)}</td>
                                                <td className={`py-2 text-right ${asset.profit_loss_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {asset.profit_loss_pct >= 0 ? '+' : ''}{asset.profit_loss_pct.toFixed(1)}%
                                                </td>
                                                <td className="py-2 text-right">{asset.weight_pct.toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Risk Analysis */}
                        {report.risk_analysis && (
                            <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:border">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                                    Análise de Riscos
                                </h2>
                                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                                    {report.risk_analysis}
                                </div>
                            </div>
                        )}

                        {/* Opportunities */}
                        {report.opportunities && (
                            <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:border">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                                    Oportunidades Identificadas
                                </h2>
                                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                                    {report.opportunities}
                                </div>
                            </div>
                        )}

                        {/* Recommendations */}
                        {report.recommendations && (
                            <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:border">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Target className="w-5 h-5 text-green-500" />
                                    Recomendações
                                </h2>
                                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                                    {report.recommendations}
                                </div>
                            </div>
                        )}

                        {/* Dividend Projection */}
                        {report.dividend_projection && (
                            <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:border">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-600" />
                                    Projeção de Dividendos
                                </h2>
                                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                                    {report.dividend_projection}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="text-center text-sm text-gray-400 py-4 print:py-2">
                            <p>
                                Relatório gerado automaticamente pelo Carteira Inteligente.
                                <br />
                                As análises são baseadas em dados de mercado e não constituem recomendação de investimento.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
