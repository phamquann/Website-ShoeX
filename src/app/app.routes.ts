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
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
