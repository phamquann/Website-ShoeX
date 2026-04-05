import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NotificationService } from '../../services/notification/notification.service';
import { CartService } from '../../services/cart/cart.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-wrapper">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo"></div>
          <h2>ShoeX</h2>
        </div>
        <nav class="sidebar-menu">
          <a class="menu-item" routerLink="/dashboard" routerLinkActive="active" *ngIf="userRole !== 'CUSTOMER'">
            <i class="icon-dashboard"></i> Dashboard
          </a>

          <ng-container *ngIf="userRole === 'ADMIN' || userRole === 'STAFF'">
            <div class="menu-label">QUẢN TRỊ</div>
            <a class="menu-item" routerLink="/users" routerLinkActive="active">
              <i class="icon-users"></i> Users Management
            </a>
            <a class="menu-item" routerLink="/roles" routerLinkActive="active" *ngIf="userRole === 'ADMIN'">
              <i class="icon-roles"></i> Roles & Permissions
            </a>
            <a class="menu-item" routerLink="/brands" routerLinkActive="active">
              <i class="icon-brand" style="margin-right:8px">🏷️</i> Brands
            </a>
            <a class="menu-item" routerLink="/categories" routerLinkActive="active">
              <i class="icon-category" style="margin-right:8px">📁</i> Categories
            </a>
            <a class="menu-item" routerLink="/products" routerLinkActive="active">
              <i class="icon-product" style="margin-right:8px">👟</i> Products
            </a>
            <a class="menu-item" routerLink="/coupons" routerLinkActive="active">
              <i class="icon-coupon" style="margin-right:8px">🎟️</i> Coupons
            </a>
            <a class="menu-item" routerLink="/promotions" routerLinkActive="active">
              <i class="icon-promotion" style="margin-right:8px">🔥</i> Promotions
            </a>
            <a class="menu-item" routerLink="/shipments" routerLinkActive="active">
              <i class="icon-shipment" style="margin-right:8px">🚚</i> Shipments
            </a>
            <a class="menu-item" routerLink="/return-requests" routerLinkActive="active">
              <i class="icon-return" style="margin-right:8px">↩️</i> Return / Refund
            </a>
            <a class="menu-item" routerLink="/audit-logs" routerLinkActive="active" *ngIf="userRole === 'ADMIN'">
              <i class="icon-audit"></i> Audit Logs
            </a>
            <a class="menu-item" routerLink="/system-notifications" routerLinkActive="active" *ngIf="userRole === 'ADMIN'">
              <i class="icon-notification"></i> Push Notification
            </a>
          </ng-container>

          <ng-container *ngIf="userRole === 'CUSTOMER'">
            <div class="menu-label">MUA SẮM</div>
            <a class="menu-item" routerLink="/products-catalog" routerLinkActive="active">
              <i class="icon-shop" style="margin-right:8px">🛍️</i> Product Catalog
            </a>
            <a class="menu-item" routerLink="/cart" routerLinkActive="active" style="position: relative;">
              <i class="icon-cart" style="margin-right:8px">🛒</i> Giỏ Hàng
              <span class="badge-count" style="position: static; margin-left: auto;" *ngIf="(cartCount$ | async) as count">{{ count }}</span>
            </a>
            <a class="menu-item" routerLink="/addresses" routerLinkActive="active">
              <i class="icon-address" style="margin-right:8px">🗺️</i> Địa Chỉ Nhận Hàng
            </a>
            <a class="menu-item" routerLink="/wishlists" routerLinkActive="active">
              <i class="icon-wishlist" style="margin-right:8px">❤️</i> Wishlists
            </a>
            <a class="menu-item" routerLink="/reviews" routerLinkActive="active">
              <i class="icon-review" style="margin-right:8px">⭐</i> My Reviews
            </a>
            <a class="menu-item" routerLink="/return-requests" routerLinkActive="active">
              <i class="icon-return" style="margin-right:8px">↩️</i> Return / Refund
            </a>
          </ng-container>

          <div class="menu-divider"></div>
          <a class="menu-item" routerLink="/orders" routerLinkActive="active">
            <i class="icon-order" style="margin-right:8px">📦</i> {{ userRole === 'ADMIN' || userRole === 'STAFF' ? 'Quản Lý Đơn Hàng' : 'Đơn Hàng Của Tôi' }}
          </a>

          <a class="menu-item logout" (click)="logout()">
            <i class="icon-logout"></i> Đăng xuất
          </a>
        </nav>
      </aside>

      <main class="main-content">
        <header class="topbar">
          <div class="search-bar">
            Hi, {{ userName }}!
            <span class="role-badge" *ngIf="userRole">{{ userRole }}</span>
          </div>
          <div class="topbar-actions">
            <div class="notification-container">
              <button class="btn-icon" (click)="toggleNotifications()">
                🔔
                <span class="badge-count" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
              </button>

              <div class="notification-dropdown" *ngIf="showNotifications">
                <div class="notif-header">
                  <h4>Thông báo</h4>
                  <button class="mark-all-btn" (click)="markAllAsRead()">Đánh dấu đã đọc</button>
                </div>
                <div class="notif-list">
                  <div class="notif-item" *ngIf="notifications.length === 0">
                    <p style="color:var(--text-secondary); text-align:center;">Không có thông báo mới.</p>
                  </div>
                  <div class="notif-item" *ngFor="let n of notifications" [class.unread]="!n.isRead" (click)="markAsRead(n._id)">
                    <div class="notif-content">
                      <strong>{{ n.title }}</strong>
                      <p>{{ n.message }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="avatar" [style.backgroundImage]="'url(' + (avatarUrl || 'http://localhost:3000/uploads/default-avatar.png') + ')'" [style.backgroundSize]="'cover'" [style.backgroundPosition]="'center'" (click)="goToProfile()" title="Hồ sơ cá nhân">
              <span *ngIf="!avatarUrl">{{ userName.charAt(0).toUpperCase() }}</span>
            </div>
          </div>
        </header>

        <div class="content-area">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .admin-wrapper { display: flex; height: 100vh; background: var(--bg-dark); overflow: hidden; }
    .sidebar { width: 260px; background: var(--surface-dark); border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; }
    .sidebar-header { padding: 24px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .sidebar-header .logo { width: 32px; height: 32px; background: linear-gradient(135deg, #4f46e5, #8b5cf6); border-radius: 8px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4); }
    .sidebar-header h2 { font-size: 20px; font-weight: 700; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .sidebar-menu { padding: 24px 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
    .sidebar-menu .menu-item { padding: 12px 16px; border-radius: 12px; color: var(--text-secondary); text-decoration: none; font-weight: 500; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 12px; font-size: 15px; }
    .sidebar-menu .menu-item:hover, .sidebar-menu .menu-item.active { background: rgba(79, 70, 229, 0.1); color: var(--primary); }
    .sidebar-menu .menu-item.logout { margin-top: auto; color: var(--error); }
    .sidebar-menu .menu-item.logout:hover { background: rgba(239, 68, 68, 0.1); }
    .sidebar-menu .menu-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 16px 0; }
    .sidebar-menu .menu-label { padding: 12px 16px 8px; font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; }
    .main-content { flex: 1; display: flex; flex-direction: column; }
    .topbar { height: 72px; padding: 0 32px; background: var(--surface-dark); border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; }
    .topbar .search-bar { font-weight: 600; color: #fff; display: flex; align-items: center; gap: 12px; }
    .role-badge { background: rgba(79, 70, 229, 0.2); color: #818cf8; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }
    .topbar .topbar-actions { display: flex; align-items: center; gap: 24px; position: relative; }
    .topbar .btn-icon { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; font-size: 20px; position: relative; }
    .topbar .btn-icon:hover { filter: brightness(1.5); }
    .topbar .avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #4f46e5, #8b5cf6); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4); cursor: pointer; border: 2px solid transparent; transition: 0.2s; }
    .topbar .avatar:hover { border-color: var(--primary); }
    .content-area { padding: 32px; flex: 1; overflow-y: auto; }

    .notification-container { position: relative; }
    .badge-count { position: absolute; top: -5px; right: -5px; background: var(--error); color: white; border-radius: 10px; font-size: 10px; padding: 2px 6px; font-weight: bold; }
    .notification-dropdown { position: absolute; top: 40px; right: -60px; width: 320px; background: var(--surface-dark); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 100; overflow: hidden; animation: floatUp 0.2s; }
    .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .notif-header h4 { margin: 0; font-size: 16px; color: #fff; }
    .mark-all-btn { background: transparent; border: none; color: var(--primary); font-size: 12px; cursor: pointer; font-weight: 600; }
    .mark-all-btn:hover { text-decoration: underline; }
    .notif-list { max-height: 350px; overflow-y: auto; }
    .notif-item { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.02); cursor: pointer; display: flex; transition: 0.2s; }
    .notif-item:hover { background: rgba(255,255,255,0.02); }
    .notif-item.unread { background: rgba(79, 70, 229, 0.05); border-left: 3px solid var(--primary); }
    .notif-content strong { color: #fff; font-size: 14px; display: block; margin-bottom: 4px; }
    .notif-content p { color: var(--text-secondary); font-size: 13px; margin: 0; line-height: 1.4; }
  `]
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  userRole: string = '';
  userName: string = 'User';
  avatarUrl: string = '';

  notifications: any[] = [];
  unreadCount: number = 0;
  showNotifications = false;

  cartCount$ = this.cartService.cartCount$;

  private pollingInterval: any;

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private cartService: CartService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadNotifications();
    this.cartService.getMyCart().subscribe();

    window.addEventListener('storage', () => this.loadUserData());
    this.pollingInterval = setInterval(() => this.loadUserData(), 10000);
  }

  ngOnDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  loadUserData() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.userRole = user.role?.name || '';
        this.userName = user.fullName || user.username || 'User';
        this.avatarUrl = user.avatarUrl || '';

        if (this.userRole === 'CUSTOMER' && (this.router.url === '/dashboard' || this.router.url === '/')) {
          this.router.navigate(['/products-catalog']);
        }

        if (this.router.url.includes('/users') && this.userRole !== 'ADMIN' && this.userRole !== 'STAFF') {
          this.router.navigate(['/dashboard']);
        }
      } catch (e) {}
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadNotifications() {
    this.notificationService.getNotifications().subscribe((res: any) => {
      if (res.success) {
        this.notifications = res.data;
        this.calculateUnread();
      }
    });
  }

  calculateUnread() {
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  markAsRead(id: string) {
    this.notificationService.markAsRead(id).subscribe((res: any) => {
      if (res.success) {
        const notif = this.notifications.find(n => n._id === id);
        if (notif) notif.isRead = true;
        this.calculateUnread();
      }
    });
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.isRead = true);
    this.unreadCount = 0;
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
