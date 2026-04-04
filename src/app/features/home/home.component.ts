import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <div class="dashboard-container">
      <div class="header">
        <h1>Tổng Quan Hệ Thống</h1>
        <p>Chào mừng trở lại! Xem thống kê nhanh của bạn dưới đây.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="icon users">👤</div>
          <div class="info">
            <h3>Tổng Users</h3>
            <p>1,234</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="icon roles">🛡️</div>
          <div class="info">
            <h3>Tổng Roles</h3>
            <p>12</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="icon notification">🔔</div>
          <div class="info">
            <h3>Thông Báo Mới</h3>
            <p>48</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="icon logs">📄</div>
          <div class="info">
            <h3>Audit Logs</h3>
            <p>3,902</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .header {
      h1 { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 8px; }
      p { color: var(--text-secondary); }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 24px;
    }

    .stat-card {
      background: var(--surface-dark);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 20px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 20px;
      transition: all 0.3s;
      cursor: pointer;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        border-color: rgba(79, 70, 229, 0.4);
      }

      .icon {
        width: 60px;
        height: 60px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;

        &.users { background: rgba(79, 70, 229, 0.1); color: #4f46e5; }
        &.roles { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        &.notification { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        &.logs { background: rgba(236, 72, 153, 0.1); color: #ec4899; }
      }

      .info {
        h3 { font-size: 14px; color: var(--text-secondary); font-weight: 500; margin-bottom: 4px; }
        p { font-size: 24px; font-weight: 700; color: #fff; }
      }
    }
  `]
})
export class HomeComponent {}
