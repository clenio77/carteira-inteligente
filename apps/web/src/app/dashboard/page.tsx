"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { isAuthenticated } from "@/lib/auth";
import { getPortfolioOverview } from "@/lib/portfolio";
import { getFinanceDashboardSummary } from "@/lib/personal-finance";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  RefreshCw,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  BarChart3,
  Plus,
  Landmark,
  Calculator,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationsMenu from "@/components/notifications-menu";
import { MarketTicker } from "@/components/market-ticker";
import { PortfolioHistoryChart } from "@/components/dashboard/portfolio-history-chart";
import { DividendChart } from "@/components/dashboard/dividend-chart";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { BenchmarkComparison } from "@/components/dashboard/benchmark-comparison";
import { MarketIntelligence } from "@/components/dashboard/market-intelligence";

export default function DashboardPage() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  // Fetch portfolio overview directly (works for manual assets and CEI)
  const { data: portfolio, isLoading, error, refetch } = useQuery({
    queryKey: ["portfolioOverview"],
    queryFn: getPortfolioOverview,
    retry: 1,
  });

  // Fetch finance summary for Net Worth calculation
  const { data: financeSummary } = useQuery({
    queryKey: ["financeSummary"],
    queryFn: getFinanceDashboardSummary,
    retry: 1,
  });

  // Check if user has any positions
  useEffect(() => {
    if (portfolio) {
      setIsConnected(portfolio.positions_count > 0);
    } else if (error) {
      setIsConnected(false);
    }
  }, [portfolio, error]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  // Not connected to CEI
  if (isConnected === false) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/add-assets">
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Ativos
                </Button>
              </Link>
              <NotificationsMenu />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <LinkIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              Conecte sua conta do CEI
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Para começar a consolidar sua carteira, conecte sua conta do Canal
              Eletrônico do Investidor (CEI) da B3.
            </p>
            <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-4">
              <Link href="/dashboard/connect-cei">
                <Button size="lg">
                  <LinkIcon className="w-5 h-5 mr-2" />
                  Conectar ao CEI
                </Button>
              </Link>
              <span className="text-gray-400">ou</span>
              <Link href="/dashboard/add-assets">
                <Button size="lg" variant="outline">
                  <Plus className="w-5 h-5 mr-2" />
                  Importar / Manual
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading portfolio
  if (isLoading || isConnected === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando sua carteira...</p>
        </div>
      </div>
    );
  }

  // Error loading portfolio
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Erro ao carregar carteira
            </h2>
            <p className="text-red-700 mb-4">
              Não foi possível carregar os dados da sua carteira.
            </p>
            <Button onClick={() => refetch()}>Tentar Novamente</Button>
          </div>
        </div>
      </div>
    );
  }

  const isProfitable = portfolio && portfolio.profit_loss >= 0;



  const portfolioValue = portfolio?.total_value || 0;
  const cashBalance = financeSummary?.total_balance || 0;
  const netWorth = portfolioValue + cashBalance;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/add-assets">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Ativos
                </Button>
              </Link>
              <Link href="/dashboard/market">
                <Button variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Cotações
                </Button>
              </Link>
              <Link href="/dashboard/finance">
                <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Gestão Financeira
                </Button>
              </Link>
              <Link href="/dashboard/proceeds">
                <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Proventos
                </Button>
              </Link>
              <Link href="/dashboard/barsi">
                <Button variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50">
                  <Calculator className="w-4 h-4 mr-2" />
                  Preço Teto
                </Button>
              </Link>
              <NotificationsMenu />
            </div>
          </div>

          {/* Net Worth Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Net Worth */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl shadow-lg p-6 text-white col-span-1 md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-indigo-100 font-medium">Patrimônio Total</span>
                <Landmark className="w-6 h-6 text-indigo-100" />
              </div>
              <p className="text-4xl font-bold">
                {formatCurrency(netWorth)}
              </p>
              <div className="mt-4 flex gap-4 text-sm text-indigo-100">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 mr-2"></div>
                  Investido: {((portfolioValue / netWorth || 0) * 100).toFixed(0)}%
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-300 mr-2"></div>
                  Caixa: {((cashBalance / netWorth || 0) * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Investments */}
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-emerald-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Investimentos</span>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(portfolioValue)}
              </p>
              <p className={`text-sm mt-1 flex items-center ${isProfitable ? "text-emerald-600" : "text-red-600"}`}>
                {isProfitable ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {portfolio && formatPercentage(portfolio.profit_loss_percentage)}
              </p>
            </div>

            {/* Cash Balance */}
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Saldo em Contas</span>
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(cashBalance)}
              </p>
              <Link href="/dashboard/finance" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                Gerenciar contas &rarr;
              </Link>
            </div>
          </div>

          {/* Profit/Loss */}
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
              className={`text-3xl font-bold ${isProfitable ? "text-green-600" : "text-red-600"
                }`}
            >
              {portfolio && formatCurrency(portfolio.profit_loss)}
            </p>
            <p
              className={`text-sm mt-1 ${isProfitable ? "text-green-600" : "text-red-600"
                }`}
            >
              {portfolio && formatPercentage(portfolio.profit_loss_percentage)}
            </p>
          </div>

          {/* Assets Count */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Ativos</span>
              <PieChart className="w-5 h-5 text-primary-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {portfolio?.positions_count || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Posições ativas</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <PortfolioHistoryChart />
          <DividendChart />
        </div>

        {/* Market Ticker */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-primary-600" />
              Cotações do Mercado
            </h3>
            <Link href="/dashboard/market">
              <Button variant="ghost" size="sm">
                Ver Mais
              </Button>
            </Link>
          </div>
          <MarketTicker />
        </div>

        {/* Allocation and Top Positions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Allocation by Type */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Alocação por Tipo
            </h3>
            <AllocationChart
              data={portfolio?.allocation_by_type || []}
              totalValue={portfolio?.total_value}
            />
          </div>

          {/* Top Positions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top 5 Posições
            </h3>
            <div className="space-y-4">
              {portfolio?.top_positions.map((position) => (
                <Link
                  key={position.ticker}
                  href={`/dashboard/assets/${position.ticker}`}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{position.ticker}</p>
                    <p className="text-sm text-gray-500">{position.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(position.value)}
                    </p>
                    <p
                      className={`text-sm ${position.profit_loss_percentage >= 0
                        ? "text-green-600"
                        : "text-red-600"
                        }`}
                    >
                      {formatPercentage(position.profit_loss_percentage)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <Link href="/dashboard/assets">
              <Button variant="outline" className="w-full mt-4">
                Ver Todos os Ativos
              </Button>
            </Link>
          </div>
        </div>

        {/* Benchmark Comparison & Market Intelligence */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BenchmarkComparison portfolioReturn={portfolio?.profit_loss_percentage || 0} />
          <MarketIntelligence
            portfolioTickers={portfolio?.top_positions?.map(p => p.ticker) || []}
          />
        </div>
      </div>
    </div>
  );
}

