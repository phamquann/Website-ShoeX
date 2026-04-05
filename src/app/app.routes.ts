import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { HomeComponent } from './features/home/home.component';
import { AdminLayoutComponent } from './core/layout/admin-layout/admin-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: HomeComponent },
      { 
        path: 'users', 
        loadComponent: () => import('./features/users/user-list/user-list.component').then(m => m.UserListComponent),
        data: { roles: ['ADMIN', 'STAFF'] }
      },
      { 
        path: 'roles', 
        loadComponent: () => import('./features/roles/role-list/role-list.component').then(m => m.RoleListComponent),
        data: { roles: ['ADMIN'] }
      },
      { 
        path: 'audit-logs', 
        loadComponent: () => import('./features/audit-logs/audit-log-list/audit-log-list.component').then(m => m.AuditLogListComponent),
        data: { roles: ['ADMIN'] }
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'system-notifications',
        loadComponent: () => import('./features/notifications/system-notification/system-notification.component').then(m => m.SystemNotificationComponent),
        data: { roles: ['ADMIN'] }
      },
      {
        path: 'addresses',
        loadComponent: () => import('./features/addresses/address-list/address-list.component').then(m => m.AddressListComponent),
        data: { roles: ['CUSTOMER'] }
      },
      {
        path: 'brands',
        loadComponent: () => import('./features/brands/brand-list/brand-list.component').then(m => m.BrandListComponent),
        data: { roles: ['ADMIN', 'STAFF'] }
      },
      {
        path: 'categories',
        loadComponent: () => import('./features/categories/category-list/category-list.component').then(m => m.CategoryListComponent),
        data: { roles: ['ADMIN', 'STAFF'] }
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/product-list/product-list.component').then(m => m.ProductListComponent),
        data: { roles: ['ADMIN', 'STAFF'] }
      },
      {
        path: 'products-catalog',
        loadComponent: () => import('./features/shopping/product-catalog/product-catalog.component').then(m => m.ProductCatalogComponent),
        data: { roles: ['CUSTOMER'] }
      },
      {
        path: 'cart',
        loadComponent: () => import('./features/shopping/cart/cart.component').then(m => m.CartComponent),
        data: { roles: ['CUSTOMER'] }
      },
      {
        path: 'checkout',
        loadComponent: () => import('./features/shopping/checkout/checkout.component').then(m => m.CheckoutComponent),
        data: { roles: ['CUSTOMER'] }
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/orders/order-list/order-list.component').then(m => m.OrderListComponent)
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./features/orders/order-detail/order-detail.component').then(m => m.OrderDetailComponent)
      },
      {
        path: 'coupons',
        loadComponent: () => import('./features/coupons/coupon-list/coupon-list.component').then(m => m.CouponListComponent),
        data: { roles: ['ADMIN', 'STAFF'] }
      },
      {
        path: 'promotions',
        loadComponent: () => import('./features/promotions/promotion-list/promotion-list.component').then(m => m.PromotionListComponent),
        data: { roles: ['ADMIN', 'STAFF'] }
      },
      {
        path: 'wishlists',
        loadComponent: () => import('./features/wishlists/wishlist-list/wishlist-list.component').then(m => m.WishlistListComponent),
        data: { roles: ['CUSTOMER'] }
      },
      {
        path: 'reviews',
        loadComponent: () => import('./features/reviews/review-list/review-list.component').then(m => m.ReviewListComponent)
      },
      {
        path: 'shipments',
        loadComponent: () => import('./features/shipments/shipment-list/shipment-list.component').then(m => m.ShipmentListComponent),
        data: { roles: ['ADMIN', 'STAFF'] }
      },
      {
        path: 'return-requests',
        loadComponent: () => import('./features/return-requests/return-request-list/return-request-list.component').then(m => m.ReturnRequestListComponent)
      },
      {
        path: 'refunds',
        loadComponent: () => import('./features/refunds/refund-list/refund-list.component').then(m => m.RefundListComponent),
        data: { roles: ['ADMIN', 'STAFF'] }
      },
      {
        path: 'banners',
        loadComponent: () => import('./features/banners/banner-list/banner-list.component').then(m => m.BannerListComponent),
        data: { roles: ['ADMIN', 'STAFF'] }
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
