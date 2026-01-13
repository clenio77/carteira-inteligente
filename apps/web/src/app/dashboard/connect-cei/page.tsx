"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TrendingUp, Loader2, AlertCircle, CheckCircle2, Shield } from "lucide-react";
import { connectCEI } from "@/lib/portfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ceiSchema = z.object({
  cpf: z.string().min(11, "CPF deve ter 11 dígitos").max(14, "CPF inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type CEIFormData = z.infer<typeof ceiSchema>;

export default function ConnectCEIPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CEIFormData>({
    resolver: zodResolver(ceiSchema),
  });

  const onSubmit = async (data: CEIFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await connectCEI(data);
      setSuccess(true);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || "Erro ao conectar com CEI. Tente novamente.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-8">
            <TrendingUp className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">Conectar ao CEI</h1>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-start space-x-3">
              <Shield className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  Suas credenciais estão seguras
                </h3>
                <p className="text-sm text-blue-800">
                  Suas credenciais do CEI são criptografadas e armazenadas com segurança.
                  Utilizamos os mesmos padrões de segurança de instituições financeiras.
                </p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Conectado com sucesso!
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Sua carteira foi sincronizada. Redirecionando...
                </p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Credenciais do CEI (B3)
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label
                  htmlFor="cpf"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  CPF
                </label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  {...register("cpf")}
                  disabled={isLoading || success}
                />
                {errors.cpf && (
                  <p className="text-sm text-red-600 mt-1">{errors.cpf.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Seu CPF cadastrado no CEI da B3
                </p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Senha do CEI
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha do CEI"
                  {...register("password")}
                  disabled={isLoading || success}
                />
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.password.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  A senha será criptografada antes de ser armazenada
                </p>
              </div>

              <div className="flex space-x-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading || success}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Conectando e sincronizando...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Conectado!
                    </>
                  ) : (
                    "Conectar e Sincronizar"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading || success}
                >
                  Voltar
                </Button>
              </div>
            </form>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Não tem acesso ao CEI?
            </h4>
            <p className="text-sm text-gray-600">
              O CEI (Canal Eletrônico do Investidor) é o portal oficial da B3 onde você
              pode consultar suas posições em investimentos. Acesse{" "}
              <a
                href="https://cei.b3.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline"
              >
                cei.b3.com.br
              </a>{" "}
              para criar sua senha.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

