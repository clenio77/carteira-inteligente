"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAuthenticated } from "@/lib/auth";
import {
    addTransaction,
    uploadCSV,
    getTransactions,
    deleteTransaction,
    getPositions,
    downloadCSVTemplate,
    AddTransactionRequest,
    TransactionResponse,
    uploadNote
} from "@/lib/portfolio-manage";
import { getAccounts } from "@/lib/personal-finance";
import { searchStocks } from "@/lib/market";
import {
    Plus,
    Upload,
    FileSpreadsheet,
    ArrowLeft,
    Loader2,
    Check,
    X,
    Trash2,
    AlertCircle,
    Info,
    Download,
    TrendingUp,
    TrendingDown,
    FileText,
    Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AddAssetsPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const ocrInputRef = useRef<HTMLInputElement>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState<"manual" | "csv" | "ocr">("manual");

    // OCR State
    const [ocrFile, setOcrFile] = useState<File | null>(null);
    const [analyzedData, setAnalyzedData] = useState<any>(null);

    // Form state
    const [formData, setFormData] = useState<AddTransactionRequest>({
        ticker: "",
        asset_name: "",
        asset_type: "ACAO",
        transaction_type: "COMPRA",
        quantity: 0,
        price: 0,
        transaction_date: new Date().toISOString().split("T")[0],
        fees: 0,
    });

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Upload state
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadResult, setUploadResult] = useState<{
        success: boolean;
        message: string;
        errors?: string[];
    } | null>(null);

    // Success message
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Camera state
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = async () => {
        setCameraError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true
            });
            setStream(mediaStream);
            setIsCameraOpen(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setCameraError("Não foi possível acessar a câmera. Verifique as permissões.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraOpen(false);
    };

    useEffect(() => {
        if (isCameraOpen && stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [isCameraOpen, stream]);

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            if (context) {
                // Set canvas dimensions to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw video frame to canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert to file
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
                        setOcrFile(file);
                        stopCamera();
                    }
                }, "image/jpeg", 0.95);
            }
        }
    };

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);


    useEffect(() => {
        if (!isAuthenticated()) {
            router.push("/login");
        }
    }, [router]);

    // Fetch transactions
    const { data: transactions, refetch: refetchTransactions } = useQuery({
        queryKey: ["userTransactions"],
        queryFn: () => getTransactions(undefined, 20),
    });

    // Fetch positions
    const { data: positions } = useQuery({
        queryKey: ["userPositions"],
        queryFn: getPositions,
    });

    const { data: accounts } = useQuery({
        queryKey: ["accounts"],
        queryFn: getAccounts
    });

    // Add transaction mutation
    const addMutation = useMutation({
        mutationFn: addTransaction,
        onSuccess: (data) => {
            setSuccessMessage(data.message);
            queryClient.invalidateQueries({ queryKey: ["userTransactions"] });
            queryClient.invalidateQueries({ queryKey: ["userPositions"] });
            queryClient.invalidateQueries({ queryKey: ["portfolioOverview"] });
            // Reset form
            setFormData({
                ticker: "",
                asset_name: "",
                asset_type: "ACAO",
                transaction_type: "COMPRA",
                quantity: 0,
                price: 0,
                transaction_date: new Date().toISOString().split("T")[0],
                fees: 0,
            });
            setTimeout(() => setSuccessMessage(null), 5000);
        },
    });

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: uploadCSV,
        onSuccess: (data) => {
            setUploadResult({
                success: data.transactions_created > 0,
                message: data.message,
                errors: data.errors,
            });
            queryClient.invalidateQueries({ queryKey: ["userTransactions"] });
            queryClient.invalidateQueries({ queryKey: ["userPositions"] });
            queryClient.invalidateQueries({ queryKey: ["portfolioOverview"] });
            setUploadFile(null);
        },
        onError: (error: any) => {
            setUploadResult({
                success: false,
                message: error.response?.data?.detail || "Erro ao processar arquivo",
            });
        },
    });

    const ocrMutation = useMutation({
        mutationFn: uploadNote,
        onSuccess: (data) => {
            setAnalyzedData(data);
            setOcrFile(null);
        },
        onError: (error: any) => {
            alert("Erro na análise da nota: " + (error.response?.data?.detail || "Erro desconhecido"));
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: deleteTransaction,
        onSuccess: () => {
            refetchTransactions();
            queryClient.invalidateQueries({ queryKey: ["userPositions"] });
            queryClient.invalidateQueries({ queryKey: ["portfolioOverview"] });
        },
    });

    // ... handlers ...

    const handleOcrUpload = () => {
        if (ocrFile) {
            ocrMutation.mutate(ocrFile);
        }
    };

    const applyOcrTransaction = (tx: any) => {
        // Populate manual form with OCR data
        setFormData({
            ticker: tx.ticker.split(" ")[0],
            asset_name: "",
            asset_type: "ACAO",
            transaction_type: tx.tipo === "VENDA" ? "VENDA" : "COMPRA",
            quantity: tx.quantidade,
            price: tx.preco,
            transaction_date: analyzedData.data_pregao || new Date().toISOString().split("T")[0],
            fees: tx.taxas || 0,
        });
        setActiveTab("manual");
    };

    // Search for stocks
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        setIsSearching(true);
        setShowSearchResults(true); // Always show mechanism to allow manual entry

        try {
            const results = await searchStocks(query);
            setSearchResults(results.results.slice(0, 8));
        } catch (error) {
            console.error("Search error:", error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Select stock from search
    const selectStock = (stock: any) => {
        setFormData({
            ...formData,
            ticker: stock.stock,
            asset_name: stock.name || stock.stock,
        });
        setSearchQuery("");
        setShowSearchResults(false);
    };

    // Handle form submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.ticker || formData.quantity <= 0 || formData.price <= 0) {
            return;
        }
        addMutation.mutate(formData);
    };

    // Handle file upload
    const handleFileUpload = () => {
        if (uploadFile) {
            uploadMutation.mutate(uploadFile);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar
                            </Button>
                        </Link>
                        <Plus className="w-8 h-8 text-primary-600" />
                        <h1 className="text-3xl font-bold text-gray-900">
                            Adicionar Ativos
                        </h1>
                    </div>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center">
                        <Check className="w-5 h-5 text-green-600 mr-3" />
                        <span className="text-green-800">{successMessage}</span>
                    </div>
                )}

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm mb-6">
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab("manual")}
                            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === "manual"
                                ? "text-primary-600 border-b-2 border-primary-600"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            <Plus className="w-5 h-5 inline mr-2" />
                            Adicionar Manualmente
                        </button>
                        <button
                            onClick={() => setActiveTab("csv")}
                            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === "csv"
                                ? "text-primary-600 border-b-2 border-primary-600"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            <Upload className="w-5 h-5 inline mr-2" />
                            Importar CSV
                        </button>
                        <button
                            onClick={() => setActiveTab("ocr")}
                            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === "ocr"
                                ? "text-primary-600 border-b-2 border-primary-600"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            <Camera className="w-5 h-5 inline mr-2" />
                            Ler Nota (IA)
                        </button>
                    </div>

                    {/* Manual Tab */}
                    {activeTab === "manual" && (
                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Stock Search */}
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Buscar Ativo
                                    </label>
                                    <input
                                        type="text"
                                        value={searchQuery || formData.ticker}
                                        onChange={(e) => {
                                            if (!formData.ticker) {
                                                handleSearch(e.target.value);
                                            } else {
                                                setFormData({ ...formData, ticker: "" });
                                                handleSearch(e.target.value);
                                            }
                                        }}
                                        placeholder="Digite o ticker ou nome (ex: PETR4, Petrobras)"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    {formData.ticker && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, ticker: "", asset_name: "" });
                                                setSearchQuery("");
                                            }}
                                            className="absolute right-3 top-10 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}

                                    {/* Search Results Dropdown */}
                                    {showSearchResults && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {searchResults.map((stock) => (
                                                <button
                                                    key={stock.stock}
                                                    type="button"
                                                    onClick={() => selectStock(stock)}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                                                >
                                                    <span className="font-semibold">{stock.stock}</span>
                                                    <span className="text-gray-500 ml-2">{stock.name}</span>
                                                    {stock.close && (
                                                        <span className="float-right text-gray-600">
                                                            {formatCurrency(stock.close)}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}

                                            {/* Manual Entry Option */}
                                            {searchQuery.length >= 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => selectStock({ stock: searchQuery.toUpperCase(), name: searchQuery })}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-t border-gray-100 text-primary-600 font-medium flex items-center bg-gray-50/50"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    <span>Usar "{searchQuery.toUpperCase()}" (Manual)</span>
                                                </button>
                                            )}

                                            {searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                                                <div className="px-4 py-2 text-xs text-gray-400 text-center">
                                                    Ativo não encontrado na base de dados? Adicione-o manualmente acima.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isSearching && (
                                        <div className="absolute right-3 top-10">
                                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                        </div>
                                    )}
                                </div>

                                {/* Selected Asset Display */}
                                {formData.ticker && (
                                    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-bold text-primary-800">
                                                    {formData.ticker}
                                                </span>
                                                <span className="text-primary-600 ml-2">
                                                    {formData.asset_name}
                                                </span>
                                            </div>
                                            <Check className="w-5 h-5 text-primary-600" />
                                        </div>
                                    </div>
                                )}

                                {/* Form Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Transaction Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tipo de Operação
                                        </label>
                                        <div className="flex space-x-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormData({ ...formData, transaction_type: "COMPRA" })
                                                }
                                                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${formData.transaction_type === "COMPRA"
                                                    ? "bg-green-600 text-white"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    }`}
                                            >
                                                <TrendingUp className="w-4 h-4 inline mr-2" />
                                                Compra
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormData({ ...formData, transaction_type: "VENDA" })
                                                }
                                                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${formData.transaction_type === "VENDA"
                                                    ? "bg-red-600 text-white"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    }`}
                                            >
                                                <TrendingDown className="w-4 h-4 inline mr-2" />
                                                Venda
                                            </button>
                                        </div>
                                    </div>

                                    {/* Asset Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tipo de Ativo
                                        </label>
                                        <select
                                            value={formData.asset_type}
                                            onChange={(e) =>
                                                setFormData({ ...formData, asset_type: e.target.value })
                                            }
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        >
                                            <option value="ACAO">Ação</option>
                                            <option value="FII">FII</option>
                                            <option value="ETF">ETF</option>
                                            <option value="BDR">BDR</option>
                                            <option value="RENDA_FIXA">Renda Fixa / Tesouro</option>
                                            <option value="CRYPTO">Criptomoeda</option>
                                        </select>
                                    </div>

                                    {/* Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Data da Operação
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.transaction_date}
                                            onChange={(e) =>
                                                setFormData({ ...formData, transaction_date: e.target.value })
                                            }
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>

                                    {/* Quantity */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Quantidade
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.quantity || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    quantity: parseInt(e.target.value) || 0,
                                                })
                                            }
                                            placeholder="Ex: 100"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>

                                    {/* Price */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Preço por Ação (R$)
                                        </label>
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={formData.price || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    price: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            placeholder="Ex: 28.50"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>

                                    {/* Fees */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Taxas (R$)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.fees || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    fees: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            placeholder="Ex: 5.00"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>

                                    {/* Linked Account */}
                                    <div className="md:col-span-2 lg:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Conta de {formData.transaction_type === "COMPRA" ? "Débito" : "Crédito"} (Opcional)
                                        </label>
                                        <select
                                            value={formData.pf_account_id || "none"}
                                            onChange={(e) =>
                                                setFormData({ ...formData, pf_account_id: e.target.value === "none" ? null : parseInt(e.target.value) })
                                            }
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        >
                                            <option value="none">Não debitar/creditar em conta</option>
                                            {accounts?.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Se selecionado, o valor será {formData.transaction_type === "COMPRA" ? "descontado do" : "adicionado ao"} saldo desta conta.
                                        </p>
                                    </div>
                                </div>

                                {/* Total */}
                                {formData.quantity > 0 && formData.price > 0 && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Valor Total:</span>
                                            <span className="text-2xl font-bold text-gray-900">
                                                {formatCurrency(
                                                    formData.quantity * formData.price + (formData.fees || 0)
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full"
                                    disabled={
                                        addMutation.isPending ||
                                        !formData.ticker ||
                                        formData.quantity <= 0 ||
                                        formData.price <= 0
                                    }
                                >
                                    {addMutation.isPending ? (
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    ) : (
                                        <Plus className="w-5 h-5 mr-2" />
                                    )}
                                    Adicionar Transação
                                </Button>

                                {addMutation.isError && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                                        <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                                        <span className="text-red-800">
                                            {(addMutation.error as any)?.response?.data?.detail ||
                                                "Erro ao adicionar transação"}
                                        </span>
                                    </div>
                                )}
                            </form>
                        </div>
                    )}

                    {/* CSV Tab */}
                    {activeTab === "csv" && (
                        <div className="p-6">
                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start">
                                    <Info className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-medium mb-2">Formato do CSV:</p>
                                        <p className="font-mono bg-blue-100 p-2 rounded text-xs mb-2">
                                            ticker,tipo,quantidade,preco,data,taxas
                                            <br />
                                            PETR4,COMPRA,100,28.50,2024-01-15,5.00
                                            <br />
                                            VALE3,COMPRA,50,65.00,2024-01-20,5.00
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={downloadCSVTemplate}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Baixar Template
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Upload Area */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${uploadFile
                                    ? "border-green-500 bg-green-50"
                                    : "border-gray-300 hover:border-primary-500 hover:bg-gray-50"
                                    }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setUploadFile(file);
                                            setUploadResult(null);
                                        }
                                    }}
                                    className="hidden"
                                />

                                {uploadFile ? (
                                    <div>
                                        <FileSpreadsheet className="w-12 h-12 text-green-600 mx-auto mb-4" />
                                        <p className="text-lg font-medium text-gray-900">
                                            {uploadFile.name}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {(uploadFile.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-lg font-medium text-gray-700">
                                            Clique para selecionar um arquivo CSV
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            ou arraste e solte aqui
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Upload Button */}
                            {uploadFile && (
                                <div className="mt-6 flex space-x-4">
                                    <Button
                                        size="lg"
                                        className="flex-1"
                                        onClick={handleFileUpload}
                                        disabled={uploadMutation.isPending}
                                    >
                                        {uploadMutation.isPending ? (
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        ) : (
                                            <Upload className="w-5 h-5 mr-2" />
                                        )}
                                        Importar Transações
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={() => {
                                            setUploadFile(null);
                                            setUploadResult(null);
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            )}

                            {/* Upload Result */}
                            {uploadResult && (
                                <div
                                    className={`mt-6 rounded-lg p-4 ${uploadResult.success
                                        ? "bg-green-50 border border-green-200"
                                        : "bg-red-50 border border-red-200"
                                        }`}
                                >
                                    <div className="flex items-start">
                                        {uploadResult.success ? (
                                            <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
                                        )}
                                        <div>
                                            <p
                                                className={`font-medium ${uploadResult.success ? "text-green-800" : "text-red-800"
                                                    }`}
                                            >
                                                {uploadResult.message}
                                            </p>
                                            {uploadResult.errors && uploadResult.errors.length > 0 && (
                                                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                                                    {uploadResult.errors.map((error, i) => (
                                                        <li key={i}>{error}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* OCR Tab */}
                    {activeTab === "ocr" && (
                        <div className="p-6">
                            {!analyzedData ? (
                                <>
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                                        <div className="flex items-start">
                                            <Info className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-purple-800">
                                                <p className="font-medium mb-2">Leitura Inteligente de Notas:</p>
                                                <p>Envie uma foto ou PDF da sua nota de corretagem. Nossa IA identificará automaticamente os ativos, quantidades e preços para você conferir e adicionar.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {isCameraOpen ? (
                                        <div className="bg-black rounded-xl overflow-hidden relative">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                onLoadedMetadata={() => {
                                                    if (videoRef.current) {
                                                        videoRef.current.play().catch(e => console.error("Error playing video:", e));
                                                    }
                                                }}
                                                className="w-full h-auto max-h-[60vh] object-contain bg-black"
                                            />
                                            <canvas ref={canvasRef} className="hidden" />

                                            <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-4">
                                                <Button
                                                    onClick={capturePhoto}
                                                    size="lg"
                                                    className="rounded-full w-16 h-16 p-0 border-4 border-white bg-red-600 hover:bg-red-700"
                                                >
                                                    <Camera className="w-8 h-8 text-white" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={stopCamera}
                                                    className="absolute right-6 bottom-2 bg-white/80 hover:bg-white text-black"
                                                >
                                                    Cancelar
                                                </Button>
                                            </div>
                                            {cameraError && (
                                                <div className="absolute top-4 left-4 right-4 bg-red-500/80 text-white p-2 rounded text-center">
                                                    {cameraError}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div
                                                onClick={() => ocrInputRef.current?.click()}
                                                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${ocrFile
                                                    ? "border-green-500 bg-green-50"
                                                    : "border-gray-300 hover:border-primary-500 hover:bg-gray-50"
                                                    }`}
                                            >
                                                <input
                                                    ref={ocrInputRef}
                                                    type="file"
                                                    accept=".pdf,image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setOcrFile(file);
                                                        }
                                                    }}
                                                    className="hidden"
                                                />

                                                {ocrFile ? (
                                                    <div>
                                                        <FileText className="w-12 h-12 text-green-600 mx-auto mb-4" />
                                                        <p className="text-lg font-medium text-gray-900">{ocrFile.name}</p>
                                                        <p className="text-sm text-gray-500 mt-1">{(ocrFile.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                                        <p className="text-lg font-medium text-gray-700">Clique para selecionar Nota de Corretagem</p>
                                                        <p className="text-sm text-gray-500 mt-1">PDF ou Imagem (JPG, PNG)</p>
                                                    </div>
                                                )}
                                            </div>

                                            {!ocrFile && (
                                                <div className="flex justify-center">
                                                    <Button
                                                        variant="outline"
                                                        onClick={startCamera}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Camera className="w-4 h-4" />
                                                        Usar Câmera
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {ocrFile && !isCameraOpen && (
                                        <div className="mt-6">
                                            <Button
                                                size="lg"
                                                className="w-full"
                                                onClick={handleOcrUpload}
                                                disabled={ocrMutation.isPending}
                                            >
                                                {ocrMutation.isPending ? (
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                ) : (
                                                    <Upload className="w-5 h-5 mr-2" />
                                                )}
                                                Analisar Nota com IA
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Transações Identificadas</h3>
                                        <Button variant="outline" size="sm" onClick={() => { setAnalyzedData(null); setOcrFile(null); }}>
                                            Nova Análise
                                        </Button>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                        <p className="text-sm"><strong>Data Pregão:</strong> {analyzedData.data_pregao || "Não identificada"}</p>
                                        <p className="text-sm"><strong>Corretora:</strong> {analyzedData.corretora || "Não identificada"}</p>
                                        <p className="text-sm"><strong>Taxas Totais:</strong> {formatCurrency(analyzedData.taxas_totais || 0)}</p>
                                    </div>

                                    <div className="space-y-3">
                                        {analyzedData.transacoes?.map((tx: any, idx: number) => (
                                            <div key={idx} className="bg-white border rounded-lg p-4 shadow-sm flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-gray-900">{tx.ticker}</p>
                                                    <p className="text-sm text-gray-500">{tx.tipo} - {tx.quantidade} cotas</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium">{formatCurrency(tx.preco)}</p>
                                                    <Button
                                                        size="sm"
                                                        className="mt-1 h-8"
                                                        onClick={() => applyOcrTransaction(tx)}
                                                    >
                                                        Adicionar
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Recent Transactions */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Últimas Transações
                    </h2>
                    {transactions && transactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="py-3 px-4 text-sm font-medium text-gray-600">
                                            Data
                                        </th>
                                        <th className="py-3 px-4 text-sm font-medium text-gray-600">
                                            Ativo
                                        </th>
                                        <th className="py-3 px-4 text-sm font-medium text-gray-600">
                                            Tipo
                                        </th>
                                        <th className="py-3 px-4 text-sm font-medium text-gray-600">
                                            Qtd
                                        </th>
                                        <th className="py-3 px-4 text-sm font-medium text-gray-600">
                                            Preço
                                        </th>
                                        <th className="py-3 px-4 text-sm font-medium text-gray-600">
                                            Total
                                        </th>
                                        <th className="py-3 px-4"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {new Date(tx.transaction_date).toLocaleDateString("pt-BR")}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-medium text-gray-900">
                                                    {tx.ticker}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tx.transaction_type === "COMPRA"
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-red-100 text-red-800"
                                                        }`}
                                                >
                                                    {tx.transaction_type}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-900">
                                                {tx.quantity}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-900">
                                                {formatCurrency(tx.price)}
                                            </td>
                                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                                {formatCurrency(tx.total_amount)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => {
                                                        if (confirm("Excluir esta transação?")) {
                                                            deleteMutation.mutate(tx.id);
                                                        }
                                                    }}
                                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">
                            Nenhuma transação registrada ainda.
                        </p>
                    )}
                </div>

                {/* Current Positions */}
                {positions && positions.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Posições Atuais
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {positions.map((pos) => (
                                <div
                                    key={pos.ticker}
                                    className="bg-gray-50 rounded-lg p-4"
                                >
                                    <div className="font-bold text-gray-900">{pos.ticker}</div>
                                    <div className="text-sm text-gray-500">{pos.name}</div>
                                    <div className="mt-2 text-sm">
                                        <span className="text-gray-600">{pos.quantity} cotas</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-600">PM: </span>
                                        <span className="font-medium">
                                            {formatCurrency(pos.average_price)}
                                        </span>
                                    </div>
                                    <div className="mt-1 font-medium text-gray-900">
                                        {formatCurrency(pos.total_invested)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
