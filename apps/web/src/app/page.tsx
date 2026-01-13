import Link from "next/link";
import { ArrowRight, TrendingUp, Shield, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-8 h-8 text-primary-600" />
            <span className="text-2xl font-bold text-primary-900">
              Carteira Inteligente
            </span>
          </div>
          <div className="space-x-4">
            <Link
              href="/login"
              className="text-primary-700 hover:text-primary-900 font-medium"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Começar Grátis
            </Link>
          </div>
        </nav>

        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-primary-900 mb-6">
            Consolide Seus Investimentos
            <span className="text-primary-600"> em Um Só Lugar</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Conecte-se ao CEI da B3 e tenha uma visão completa da sua carteira,
            com análises inteligentes e insights quantitativos para melhorar
            suas decisões de investimento.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Comece Agora
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">
              Sincronização Automática
            </h3>
            <p className="text-gray-600">
              Conecte sua conta do CEI uma vez e tenha seus dados atualizados
              automaticamente todos os dias.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">
              Análises Inteligentes
            </h3>
            <p className="text-gray-600">
              Visualize gráficos de performance, alocação por setor e receba
              insights sobre sua diversificação.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">
              Segurança Máxima
            </h3>
            <p className="text-gray-600">
              Suas credenciais são criptografadas e seus dados protegidos com
              os mais altos padrões de segurança.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

