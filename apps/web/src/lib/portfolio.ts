/**
 * Portfolio API functions
 */
import api from './api';

export interface PortfolioOverview {
  total_value: number;
  total_invested: number;
  profit_loss: number;
  profit_loss_percentage: number;
  allocation_by_type: Array<{
    type: string;
    value: number;
    percentage: number;
  }>;
  allocation_by_sector: Array<{
    sector: string;
    value: number;
    percentage: number;
  }>;
  top_positions: Array<{
    ticker: string;
    name: string;
    value: number;
    percentage: number;
    profit_loss_percentage: number;
  }>;
  positions_count: number;
}

export interface AssetPosition {
  id: number;
  user_id: number;
  asset_id: number;
  quantity: number;
  average_price: number;
  current_price: number | null;
  total_value: number;
  total_invested: number;
  profit_loss: number;
  profit_loss_percentage: number;
  last_updated: string;
  created_at: string;
  asset: {
    id: number;
    ticker: string;
    name: string;
    type: string;
    sector: string | null;
    description: string | null;
  };
}

export interface AssetDetail {
  asset: {
    id: number;
    ticker: string;
    name: string;
    type: string;
    sector: string | null;
    description: string | null;
  };
  position: {
    quantity: number;
    average_price: number;
    current_price: number | null;
    total_value: number;
    total_invested: number;
    profit_loss: number;
    profit_loss_percentage: number;
  };
  transactions: Array<{
    id: number;
    type: string;
    date: string;
    quantity: number;
    price: number;
    total_amount: number;
    fees: number;
  }>;
  proceeds: Array<{
    id: number;
    type: string;
    date: string;
    value_per_share: number;
    quantity: number;
    total_value: number;
    description: string | null;
  }>;
  total_proceeds: number;
}

export interface CEICredentials {
  cpf: string;
  password: string;
}

export interface CEISyncStatus {
  status: string;
  message?: string;
  last_sync_at?: string;
  assets_synced?: number;
  transactions_synced?: number;
  proceeds_synced?: number;
}

/**
 * Get portfolio overview
 */
export const getPortfolioOverview = async (): Promise<PortfolioOverview> => {
  const response = await api.get<PortfolioOverview>('/portfolio/overview');
  return response.data;
};

/**
 * Get all assets in portfolio
 */
export const getPortfolioAssets = async (): Promise<AssetPosition[]> => {
  const response = await api.get<AssetPosition[]>('/portfolio/assets');
  return response.data;
};

/**
 * Get asset detail by ticker
 */
export const getAssetDetail = async (ticker: string): Promise<AssetDetail> => {
  const response = await api.get<AssetDetail>(`/portfolio/assets/${ticker}`);
  return response.data;
};

/**
 * Connect to CEI
 */
export const connectCEI = async (credentials: CEICredentials): Promise<CEISyncStatus> => {
  const response = await api.post<CEISyncStatus>('/cei/connect', credentials);
  return response.data;
};

/**
 * Sync portfolio with CEI
 */
export const syncCEI = async (): Promise<CEISyncStatus> => {
  const response = await api.post<CEISyncStatus>('/cei/sync');
  return response.data;
};

/**
 * Get CEI connection status
 */
export const getCEIStatus = async (): Promise<any> => {
  const response = await api.get('/cei/status');
  return response.data;
};

/**
 * Notification interfaces
 */
export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  asset_id: number | null;
  asset_ticker: string | null;
  asset_name: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
}

/**
 * Get user notifications
 */
export const getNotifications = async (unreadOnly: boolean = false): Promise<Notification[]> => {
  const response = await api.get<Notification[]>('/notifications', {
    params: { unread_only: unreadOnly },
  });
  return response.data;
};

/**
 * Get notification statistics
 */
export const getNotificationStats = async (): Promise<NotificationStats> => {
  const response = await api.get<NotificationStats>('/notifications/stats');
  return response.data;
};

/**
 * Mark notifications as read
 */
export const markNotificationsAsRead = async (notificationIds: number[]): Promise<any> => {
  const response = await api.post('/notifications/read', {
    notification_ids: notificationIds,
  });
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<any> => {
  const response = await api.post('/notifications/read-all');
  return response.data;
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: number): Promise<any> => {
  const response = await api.delete(`/notifications/${notificationId}`);
  return response.data;
};

// Rebalancing
export interface RebalanceRequest {
  targets: Record<string, number>;
}

export interface RebalanceAction {
  type: string;
  current_value: number;
  current_percentage: number;
  target_percentage: number;
  target_value: number;
  difference: number;
  action: string;
}

export interface RebalanceResponse {
  total_value: number;
  actions: RebalanceAction[];
}

export const calculateRebalancing = async (targets: RebalanceRequest): Promise<RebalanceResponse> => {
  const response = await api.post<RebalanceResponse>('/portfolio/manage/rebalance', targets);
  return response.data;
};
