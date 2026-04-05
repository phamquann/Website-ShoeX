import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AuditLogService } from '../../../core/services/audit-log/audit-log.service';

@Component({
  selector: 'app-audit-log-list',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="title-section">
          <h1>Nhật Ký Hệ Thống (Audit Logs)</h1>
          <p>Lưu vết toàn bộ hoạt động của người dùng.</p>
        </div>
      </div>

      <div class="glass-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Thời Gian</th>
                <th>Hành Động</th>
                <th>Người Thực Hiện</th>
                <th>Model</th>
                <th>Chi Tiết</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="isLoading"><td colspan="5" class="text-center">Đang tải log...</td></tr>
              <tr *ngFor="let log of logs">
                <td style="color: var(--text-secondary); font-size: 13px;">{{ log.createdAt | date:'short' }}</td>
                <td>
                  <span class="badge" 
                    [ngClass]="{
                      'bg-green': log.action.includes('LOGIN'),
                      'bg-red': log.action.includes('DELETE') || log.action.includes('LOCK'),
                      'bg-blue': log.action.includes('UPDATE') || log.action.includes('CREATE')
                    }">
                    {{ log.action }}
                  </span>
                </td>
                <td><span style="font-weight: 600">{{ log.user?.username || 'Hệ thống' }}</span></td>
                <td><code style="color: #ec4899; background: rgba(236, 72, 153, 0.1); padding: 4px 8px; border-radius: 4px;">{{ log.resource }}</code></td>
                <td><div style="max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color: var(--text-secondary); font-size: 13px;" [title]="log.detail | json">{{ log.detail | json }}</div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bg-green { background: rgba(16, 185, 129, 0.1); color: #34d399; }
    .bg-red { background: rgba(239, 68, 68, 0.1); color: #f87171; }
    .bg-blue { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
  `],
  styleUrls: ['../../users/user-list/user-list.component.scss']
})
export class AuditLogListComponent implements OnInit {
  logs: any[] = [];
  isLoading = false;

  constructor(private auditService: AuditLogService) {}

  ngOnInit() {
    this.isLoading = true;
    this.auditService.getLogs().subscribe(res => {
      // Backend returns pagination format based on BAO_CAO.md
      if(res.success) {
        this.logs = res.data;
      }
      this.isLoading = false;
    });
  }
}
