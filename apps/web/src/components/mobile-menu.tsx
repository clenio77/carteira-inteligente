'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Menu,
    X,
    Plus,
    BarChart3,
    DollarSign,
    TrendingUp,
    Calculator,
    FileText,
    Home,
    Wallet,
    PieChart,
    Bell,
    Settings,
    LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const menuItems = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        icon: Home,
        description: 'Visão geral da carteira',
    },
    {
        label: 'Adicionar Ativos',
        href: '/dashboard/add-assets',
        icon: Plus,
        description: 'Importar ou adicionar manualmente',
        highlight: true,
    },
    {
        label: 'Meus Ativos',
        href: '/dashboard/assets',
        icon: PieChart,
        description: 'Ver todos os investimentos',
    },
    {
        label: 'Cotações',
        href: '/dashboard/market',
        icon: BarChart3,
        description: 'Acompanhar o mercado',
    },
    {
        label: 'Gestão Financeira',
        href: '/dashboard/finance',
        icon: DollarSign,
        description: 'Contas e transações',
        color: 'text-emerald-600',
    },
    {
        label: 'Proventos',
        href: '/dashboard/proceeds',
        icon: TrendingUp,
        description: 'Dividendos e JCP',
        color: 'text-green-600',
    },
    {
        label: 'Renda Fixa',
        href: '/dashboard/fixed-income',
        icon: Wallet,
        description: 'CDB, LCI, LCA e mais',
    },
    {
        label: 'Preço Teto (Barsi)',
        href: '/dashboard/barsi',
        icon: Calculator,
        description: 'Calculadora de valuation',
        color: 'text-amber-600',
    },
    {
        label: 'Relatório IA',
        href: '/dashboard/report',
        icon: FileText,
        description: 'Análise inteligente',
        color: 'text-purple-600',
    },
    {
        label: 'Rebalanceamento',
        href: '/dashboard/rebalance',
        icon: Settings,
        description: 'Ajustar alocação',
    },
];

export function MobileMenu() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/login');
        setOpen(false);
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Abrir menu"
                >
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
                <SheetHeader className="p-4 border-b bg-gradient-to-r from-primary-600 to-primary-700">
                    <SheetTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="w-6 h-6" />
                        Carteira Inteligente
                    </SheetTitle>
                </SheetHeader>

                <nav className="flex flex-col h-[calc(100%-80px)]">
                    {/* Menu Items */}
                    <div className="flex-1 overflow-y-auto py-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all ${isActive
                                            ? 'bg-primary-50 text-primary-700 font-medium'
                                            : 'text-gray-700 hover:bg-gray-100'
                                        } ${item.highlight ? 'bg-primary-50' : ''}`}
                                >
                                    <Icon
                                        className={`w-5 h-5 flex-shrink-0 ${item.color || (isActive ? 'text-primary-600' : 'text-gray-500')
                                            }`}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${isActive ? 'font-medium' : ''}`}>
                                            {item.label}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {item.description}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="border-t p-4 space-y-2">
                        <Link
                            href="/dashboard/notifications"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <Bell className="w-5 h-5 text-gray-500" />
                            <span className="text-sm">Notificações</span>
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors w-full"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="text-sm font-medium">Sair</span>
                        </button>
                    </div>
                </nav>
            </SheetContent>
        </Sheet>
    );
}
