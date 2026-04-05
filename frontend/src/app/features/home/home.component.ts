import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserService } from '../../core/services/user/user.service';
import { RoleService } from '../../core/services/role/role.service';
import { NotificationService } from '../../core/services/notification/notification.service';
import { AuditLogService } from '../../core/services/audit-log/audit-log.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { OrderService } from '../../core/services/order/order.service';

interface DashboardStats {
  totalUsers: number | null;
  totalRoles: number | null;
  unreadNotifications: number | null;
  totalAuditLogs: number | null;
}

interface SalesSummary {
  totalRevenue: number;
  totalItemsSold: number;
  fulfilledOrders: number;
  averageOrderValue: number;
}

interface MonthlyRevenuePoint {
  label: string;
  revenue: number;
  orders: number;
  itemsSold: number;
  barHeight: number;
}

interface TopProductPoint {
  productName: string;
  thumbnail: string;
  quantitySold: number;
  revenue: number;
  barWidth: number;
}

interface StatusPoint {
  status: string;
  count: number;
  barWidth: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  isLoading = true;
  isAdmin = false;
  loadError = '';

  stats: DashboardStats = {
    totalUsers: null,
    totalRoles: null,
    unreadNotifications: null,
    totalAuditLogs: null
  };

  sales: SalesSummary = {
    totalRevenue: 0,
    totalItemsSold: 0,
    fulfilledOrders: 0,
    averageOrderValue: 0
  };

  monthlyRevenue: MonthlyRevenuePoint[] = [];
  topProducts: TopProductPoint[] = [];
  statusBreakdown: StatusPoint[] = [];

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private roleService: RoleService,
    private notificationService: NotificationService,
    private auditLogService: AuditLogService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.resolveRole();
    this.loadDashboard();
  }

  formatValue(value: number | null): string {
    if (this.isLoading) return '...';
    if (value === null) return '--';
    return new Intl.NumberFormat('vi-VN').format(value);
  }

  formatCurrency(value: number | null): string {
    if (this.isLoading) return '...';
    if (value === null) return '--';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(value);
  }

  toStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      shipping: 'Shipping',
      delivered: 'Delivered',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return map[status] || status;
  }

  private resolveRole(): void {
    this.isAdmin = this.authService.hasRole(['ADMIN']);
  }

  private loadDashboard(): void {
    const users$ = this.userService.getUsers(1, 1).pipe(catchError(() => of(null)));
    const notifications$ = this.notificationService.getNotifications().pipe(catchError(() => of(null)));
    const sales$ = this.orderService.getDashboardOverview(6).pipe(catchError(() => of(null)));

    const roles$ = this.isAdmin
      ? this.roleService.getRoles().pipe(catchError(() => of(null)))
      : of(null);

    const auditLogs$ = this.isAdmin
      ? this.auditLogService.getLogs().pipe(catchError(() => of(null)))
      : of(null);

    forkJoin({ users: users$, roles: roles$, notifications: notifications$, auditLogs: auditLogs$, sales: sales$ }).subscribe(({ users, roles, notifications, auditLogs, sales }) => {
      this.stats.totalUsers = this.extractMetaTotal(users, this.extractDataLength(users));
      this.stats.totalRoles = this.extractDataLength(roles);
      this.stats.unreadNotifications = this.extractUnreadCount(notifications);
      this.stats.totalAuditLogs = this.extractMetaTotal(auditLogs, this.extractDataLength(auditLogs));

      if (sales?.data) {
        this.bindSalesData(sales.data);
      } else {
        this.loadError = 'Sales dashboard data is not available right now.';
      }

      this.isLoading = false;
    });
  }

  private bindSalesData(data: any): void {
    const summary = data?.summary || {};

    this.sales = {
      totalRevenue: Number(summary.totalRevenue || 0),
      totalItemsSold: Number(summary.totalItemsSold || 0),
      fulfilledOrders: Number(summary.fulfilledOrders || 0),
      averageOrderValue: Number(summary.averageOrderValue || 0)
    };

    const monthlyRaw = Array.isArray(data?.monthlyRevenue) ? data.monthlyRevenue : [];
    const maxRevenue = Math.max(...monthlyRaw.map((m: any) => Number(m.revenue || 0)), 0);
    this.monthlyRevenue = monthlyRaw.map((row: any) => {
      const revenue = Number(row.revenue || 0);
      const barHeight = maxRevenue > 0 ? Math.max(8, Math.round((revenue / maxRevenue) * 100)) : 8;
      return {
        label: row.label || `${row.month}/${row.year}`,
        revenue,
        orders: Number(row.orders || 0),
        itemsSold: Number(row.itemsSold || 0),
        barHeight
      };
    });

    const topProductsRaw = Array.isArray(data?.topProducts) ? data.topProducts : [];
    const maxQuantity = Math.max(...topProductsRaw.map((p: any) => Number(p.quantitySold || 0)), 0);
    this.topProducts = topProductsRaw.map((product: any) => {
      const quantitySold = Number(product.quantitySold || 0);
      const barWidth = maxQuantity > 0 ? Math.max(6, Math.round((quantitySold / maxQuantity) * 100)) : 6;
      return {
        productName: product.productName || 'Unknown product',
        thumbnail: product.thumbnail || '',
        quantitySold,
        revenue: Number(product.revenue || 0),
        barWidth
      };
    });

    const statusRaw = Array.isArray(data?.statusBreakdown) ? data.statusBreakdown : [];
    const maxStatusCount = Math.max(...statusRaw.map((s: any) => Number(s.count || 0)), 0);
    this.statusBreakdown = statusRaw.map((status: any) => {
      const count = Number(status.count || 0);
      const barWidth = maxStatusCount > 0 ? Math.max(6, Math.round((count / maxStatusCount) * 100)) : 6;
      return {
        status: String(status.status || 'unknown'),
        count,
        barWidth
      };
    });
  }

  private extractMetaTotal(response: any, fallback: number | null): number | null {
    if (response?.meta?.total !== undefined && response?.meta?.total !== null) {
      return Number(response.meta.total);
    }
    return fallback;
  }

  private extractUnreadCount(response: any): number | null {
    if (response?.meta?.unreadCount !== undefined && response?.meta?.unreadCount !== null) {
      return Number(response.meta.unreadCount);
    }

    const data = this.extractDataArray(response);
    if (!data) return null;

    return data.filter((item: any) => !item?.isRead).length;
  }

  private extractDataLength(response: any): number | null {
    const data = this.extractDataArray(response);
    if (!data) return null;
    return data.length;
  }

  private extractDataArray(response: any): any[] | null {
    if (!response || !Array.isArray(response.data)) {
      return null;
    }
    return response.data;
  }
}
