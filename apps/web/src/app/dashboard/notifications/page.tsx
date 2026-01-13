"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAuthenticated } from "@/lib/auth";
import {
  getNotifications,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  type Notification,
} from "@/lib/portfolio";
import {
  TrendingUp,
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  ArrowLeft,
  DollarSign,
  AlertCircle,
  Info,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NotificationIcon = ({ type }: { type: string }) => {
  const iconMap: Record<string, JSX.Element> = {
    DIVIDEND: <DollarSign className="w-6 h-6 text-green-600" />,
    JCP: <DollarSign className="w-6 h-6 text-green-600" />,
    SYNC_STATUS: <TrendingUp className="w-6 h-6 text-blue-600" />,
    ALERT: <AlertCircle className="w-6 h-6 text-orange-600" />,
    INFO: <Info className="w-6 h-6 text-gray-600" />,
  };

  return (
    <div className="flex-shrink-0">
      {iconMap[type] || <Info className="w-6 h-6 text-gray-600" />}
    </div>
  );
};

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(false),
  });

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationStats"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationStats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationStats"] });
    },
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate([notificationId]);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (notificationId: number) => {
    deleteMutation.mutate(notificationId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const unreadCount = notifications.filter((n: Notification) => !n.is_read).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando notificações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              Erro ao carregar notificações
            </h2>
            <p className="text-gray-600 mb-6">
              Ocorreu um erro ao buscar suas notificações.
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <Bell className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Notificações</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {unreadCount} não lida{unreadCount > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              Nenhuma notificação
            </h2>
            <p className="text-gray-600 mb-8">
              Você está em dia com todas as suas notificações!
            </p>
            <Link href="/dashboard">
              <Button>Ir para o Dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification: Notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-xl shadow-sm p-6 ${
                  !notification.is_read
                    ? "border-l-4 border-primary-600"
                    : "border-l-4 border-transparent"
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <NotificationIcon type={notification.type} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {notification.title}
                        </h3>
                        <p className="text-gray-700 mb-3">{notification.message}</p>
                        {notification.asset_ticker && (
                          <Link
                            href={`/dashboard/assets/${notification.asset_ticker}`}
                            className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Ver detalhes de {notification.asset_ticker}
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Link>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.is_read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markAsReadMutation.isPending}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Marcar como lida
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(notification.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
                      <span>{formatDate(notification.created_at)}</span>
                      {notification.asset_name && (
                        <>
                          <span>•</span>
                          <span>{notification.asset_name}</span>
                        </>
                      )}
                      {!notification.is_read && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Nova
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

