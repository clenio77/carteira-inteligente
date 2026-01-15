"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAuthenticated } from "@/lib/auth";
import { getPortfolioAssets } from "@/lib/portfolio";
import api from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PriceUpdateResponse {
  success: boolean;
  message: string;
  updated_count: number;
  failed_count: number;
  updated_assets: Array<{
    ticker: string;
    old_price: number | null;
    new_price: number;
    change: number | null;
  }>;
  failed_assets: Array<{
    ticker: string;
    error: string;
  }>;
}

export default function AssetsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  const { data: assets, isLoading, error, refetch } = useQuery({
    queryKey: ["portfolioAssets"],
    queryFn: getPortfolioAssets,
  });

  // Mutation for updating prices
  const updatePricesMutation = useMutation({
    mutationFn: async () => {
      // Send empty object to ensure Content-Length header is set correctly
      const response = await api.post<PriceUpdateResponse>('/portfolio/manage/update_prices', {});
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch assets
      queryClient.invalidateQueries({ queryKey: ["portfolioAssets"] });
      queryClient.invalidateQueries({ queryKey: ["portfolioOverview"] });

      setUpdateMessage({
        type: data.success ? 'success' : 'error',
        text: data.message,
      });

      // Clear message after 5 seconds
      setTimeout(() => setUpdateMessage(null), 5000);
    },
    onError: (error: any) => {
      setUpdateMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erro ao atualizar preços',
      });
      setTimeout(() => setUpdateMessage(null), 5000);
    },
  });

  // Auto-update prices when assets load and some need updates
  useEffect(() => {
    if (assets && assets.length > 0) {
      const needsUpdate = assets.some(
        (a) => a.current_price === null || a.current_price === a.average_price
      );
      if (needsUpdate && !updatePricesMutation.isPending && !updatePricesMutation.isSuccess) {
        updatePricesMutation.mutate();
      }
    }
  }, [assets]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando ativos...</p>
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
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Erro ao carregar ativos
            </h2>
            <p className="text-red-700 mb-4">
              Não foi possível carregar a lista de ativos.
            </p>
            <Button onClick={() => refetch()}>Tentar Novamente</Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if any asset needs price update
  const needsPriceUpdate = assets?.some(
    (a) => a.current_price === null || a.current_price === a.average_price
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Meus Ativos
            </h1>
            <p className="text-gray-600">
              {assets?.length || 0} {assets?.length === 1 ? "ativo" : "ativos"} na carteira
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Voltar ao Dashboard</Button>
          </Link>
        </div>

        {/* Update Prices Banner */}
        {assets && assets.length > 0 && (
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Zap className="w-6 h-6 text-primary-600" />
                <div>
                  <p className="font-medium text-gray-900">Atualizar Cotações</p>
                  <p className="text-sm text-gray-600">
                    Buscar preços atuais da BRAPI para calcular rentabilidade
                  </p>
                </div>
              </div>
              <Button
                onClick={() => updatePricesMutation.mutate()}
                disabled={updatePricesMutation.isPending}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {updatePricesMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar Preços
                  </>
                )}
              </Button>
            </div>

            {/* Update Message */}
            {updateMessage && (
              <div className={`mt-4 p-3 rounded-lg flex items-center space-x-2 ${updateMessage.type === 'success'
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
          </div>
        )}

        {/* Assets List */}
        {assets && assets.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ativo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço Médio
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço Atual
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rentabilidade
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assets.map((position) => {
                    const isProfitable = position.profit_loss >= 0;
                    const hasCurrentPrice = position.current_price !== null && position.current_price !== position.average_price;

                    return (
                      <tr
                        key={position.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {position.asset.ticker}
                            </div>
                            <div className="text-sm text-gray-500">
                              {position.asset.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${position.asset.type === 'ACAO' ? 'bg-blue-100 text-blue-800' :
                            position.asset.type === 'FII' ? 'bg-green-100 text-green-800' :
                              position.asset.type === 'ETF' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {position.asset.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {position.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {formatCurrency(position.average_price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          {position.current_price ? (
                            <span className={hasCurrentPrice ? 'font-medium text-gray-900' : 'text-gray-400'}>
                              {formatCurrency(position.current_price)}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Atualizar</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {formatCurrency(position.total_value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {hasCurrentPrice ? (
                            <>
                              <div className={`text-sm font-medium flex items-center justify-end ${isProfitable ? "text-green-600" : "text-red-600"
                                }`}>
                                {isProfitable ? (
                                  <TrendingUp className="w-4 h-4 mr-1" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 mr-1" />
                                )}
                                {formatCurrency(position.profit_loss)}
                              </div>
                              <div className={`text-xs ${isProfitable ? "text-green-600" : "text-red-600"
                                }`}>
                                {formatPercentage(position.profit_loss_percentage)}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/dashboard/assets/${position.asset.ticker}`}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {assets.map((position) => {
                const isProfitable = position.profit_loss >= 0;
                const hasCurrentPrice = position.current_price !== null && position.current_price !== position.average_price;

                return (
                  <Link
                    key={position.id}
                    href={`/dashboard/assets/${position.asset.ticker}`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {position.asset.ticker}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {position.asset.name}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Valor:</span>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(position.total_value)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500">Rentabilidade:</span>
                        {hasCurrentPrice ? (
                          <p className={`font-medium flex items-center justify-end ${isProfitable ? "text-green-600" : "text-red-600"
                            }`}>
                            {isProfitable ? (
                              <TrendingUp className="w-4 h-4 mr-1" />
                            ) : (
                              <TrendingDown className="w-4 h-4 mr-1" />
                            )}
                            {formatPercentage(position.profit_loss_percentage)}
                          </p>
                        ) : (
                          <p className="text-gray-400">Atualizar preços</p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Nenhum ativo encontrado
            </h2>
            <p className="text-gray-600 mb-4">
              Adicione ativos à sua carteira para começar.
            </p>
            <Link href="/dashboard/add-assets">
              <Button>Adicionar Ativos</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
