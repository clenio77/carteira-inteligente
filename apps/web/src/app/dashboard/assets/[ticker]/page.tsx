"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { isAuthenticated } from "@/lib/auth";
import { getAssetDetail } from "@/lib/portfolio";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticker = params.ticker as string;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  const { data: asset, isLoading, error, refetch } = useQuery({
    queryKey: ["assetDetail", ticker],
    queryFn: () => getAssetDetail(ticker),
    enabled: !!ticker,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando detalhes do ativo...</p>
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
              Erro ao carregar ativo
            </h2>
            <p className="text-red-700 mb-4">
              Não foi possível carregar os detalhes do ativo.
            </p>
            <div className="space-x-4">
              <Button onClick={() => refetch()}>Tentar Novamente</Button>
              <Link href="/dashboard/assets">
                <Button variant="outline">Voltar</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!asset) return null;

  const isProfitable = asset.position.profit_loss >= 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/assets"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Ativos
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {asset.asset.ticker}
              </h1>
              <p className="text-lg text-gray-600">{asset.asset.name}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-primary-100 text-primary-800">
                  {asset.asset.type}
                </span>
                {asset.asset.sector && (
                  <span className="text-sm text-gray-600">
                    {asset.asset.sector}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Position Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Valor Total</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(asset.position.total_value)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {asset.position.quantity} unidades
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Preço Médio</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(asset.position.average_price)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Atual: {asset.position.current_price ? formatCurrency(asset.position.current_price) : "-"}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Lucro/Prejuízo</span>
              {isProfitable ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <p
              className={`text-2xl font-bold ${
                isProfitable ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(asset.position.profit_loss)}
            </p>
            <p
              className={`text-sm mt-1 ${
                isProfitable ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatPercentage(asset.position.profit_loss_percentage)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Proventos</span>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(asset.total_proceeds)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {asset.proceeds.length} pagamentos
            </p>
          </div>
        </div>

        {/* Transactions and Proceeds */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transactions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Histórico de Transações
            </h3>
            {asset.transactions.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {asset.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            transaction.type === "BUY"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {transaction.type === "BUY" ? "COMPRA" : "VENDA"}
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatDate(transaction.date)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mt-1">
                        {transaction.quantity} un. × {formatCurrency(transaction.price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(transaction.total_amount)}
                      </p>
                      {transaction.fees > 0 && (
                        <p className="text-xs text-gray-500">
                          Taxa: {formatCurrency(transaction.fees)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Nenhuma transação encontrada
              </p>
            )}
          </div>

          {/* Proceeds */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Proventos Recebidos
            </h3>
            {asset.proceeds.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {asset.proceeds.map((proceed) => (
                  <div
                    key={proceed.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                          {proceed.type}
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatDate(proceed.date)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mt-1">
                        {formatCurrency(proceed.value_per_share)} × {proceed.quantity}
                      </p>
                      {proceed.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {proceed.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">
                        {formatCurrency(proceed.total_value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Nenhum provento recebido
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

