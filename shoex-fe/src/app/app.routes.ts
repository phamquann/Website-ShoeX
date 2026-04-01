import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { HomeComponent } from './features/home/home.component';
import { AdminLayoutComponent } from './core/layout/admin-layout/admin-layout.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: HomeComponent },
      { 
        path: 'users', 
        loadComponent: () => import('./features/users/user-list/user-list.component').then(m => m.UserListComponent)
      },
      { 
        path: 'roles', 
        loadComponent: () => import('./features/roles/role-list/role-list.component').then(m => m.RoleListComponent)
      },
      { 
        path: 'audit-logs', 
        loadComponent: () => import('./features/audit-logs/audit-log-list/audit-log-list.component').then(m => m.AuditLogListComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'system-notifications',
        loadComponent: () => import('./features/notifications/system-notification/system-notification.component').then(m => m.SystemNotificationComponent)
      },
      {
        path: 'addresses',
        loadComponent: () => import('./features/addresses/address-list/address-list.component').then(m => m.AddressListComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
