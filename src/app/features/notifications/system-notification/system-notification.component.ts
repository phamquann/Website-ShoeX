import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification/notification.service';

@Component({
  selector: 'app-system-notification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="title-section">
          <h1>Đẩy Thông Báo Hệ Thống</h1>
          <p>Gửi thông báo toàn hệ thống hoặc tới một người dùng cụ thể.</p>
        </div>
      </div>

      <div class="glass-card form-container">
        <form (ngSubmit)="sendNotification()" class="form-layout">
          <div class="form-row">
            <div class="form-group">
              <label>Đối Tượng Nhận</label>
              <select [(ngModel)]="notif.targetType" name="targetType" class="form-control" (change)="notif.userId = ''">
                <option value="ALL">Toàn Bộ Người Dùng</option>
                <option value="USER">Một Người Dùng Cụ Thể</option>
              </select>
            </div>
            
            <div class="form-group" *ngIf="notif.targetType === 'USER'">
              <label>User ID (Sao chép từ thẻ Users Management)</label>
              <input type="text" [(ngModel)]="notif.userId" name="userId" class="form-control" placeholder="65b2a..." />
            </div>
          </div>

          <div class="form-group">
            <label>Tiêu Đề Thông Báo</label>
            <input type="text" [(ngModel)]="notif.title" name="title" class="form-control" placeholder="vd: Cập nhật hệ thống v2.0" required />
          </div>

          <div class="form-group">
            <label>Nội Dung Chi Tiết</label>
            <textarea [(ngModel)]="notif.message" name="message" class="form-control" rows="4" placeholder="Nhập nội dung thông báo..." required></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Loại Thông Báo</label>
              <select [(ngModel)]="notif.type" name="type" class="form-control">
                <option value="INFO">Thông tin chung (INFO)</option>
                <option value="WARNING">Cảnh báo (WARNING)</option>
                <option value="ERROR">Khẩn cấp (ERROR)</option>
                <option value="SUCCESS">Tin vui (SUCCESS)</option>
              </select>
            </div>
          </div>

          <button type="submit" class="btn-primary" [disabled]="isSending || !notif.title || !notif.message">
            <span *ngIf="!isSending">Gửi Thông Báo</span>
            <span *ngIf="isSending" class="spinner"></span>
          </button>
          
          <div class="success-msg" *ngIf="successMsg">✔️ {{ successMsg }}</div>
          <div class="error-msg" *ngIf="errorMsg">❌ {{ errorMsg }}</div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .form-container { max-width: 800px; padding: 32px; border-radius: 16px; background: var(--surface-dark); border: 1px solid rgba(255,255,255,0.05); }
    .form-layout { display: flex; flex-direction: column; gap: 24px; }
    .form-row { display: flex; gap: 24px; }
    .form-group { flex: 1; }
    .form-group label { display: block; margin-bottom: 8px; color: var(--text-secondary); font-size: 14px; font-weight: 500; }
    .form-control { width: 100%; padding: 14px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 15px; }
    .form-control:focus { border-color: var(--primary); outline: none; }
    select.form-control option { background: var(--bg-dark); }
    .btn-primary { margin-top: 12px; align-self: flex-start; }
    .success-msg { color: #34d399; font-size: 14px; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; }
    .error-msg { color: #f87171; font-size: 14px; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; }
  `],
  styleUrls: ['../../users/user-list/user-list.component.scss']
})
export class SystemNotificationComponent {
  notif = { targetType: 'ALL', userId: '', title: '', message: '', type: 'INFO' };
  isSending = false;
  successMsg = '';
  errorMsg = '';

  constructor(private notifService: NotificationService) {}

  sendNotification() {
    this.isSending = true;
    this.successMsg = '';
    this.errorMsg = '';

    const payload: any = {
      title: this.notif.title,
      message: this.notif.message,
      targetUserId: this.notif.targetType === 'ALL' ? 'all' : this.notif.userId
    };

    if (this.notif.targetType === 'USER' && !this.notif.userId) {
      this.errorMsg = 'Vui lòng nhập User ID!';
      this.isSending = false;
      return;
    }

    this.notifService.sendSystemNotification(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMsg = res.message || 'Đã gửi thông báo thành công!';
          this.notif = { targetType: 'ALL', userId: '', title: '', message: '', type: 'INFO' };
        } else {
          this.errorMsg = 'Gửi thất bại!';
        }
        this.isSending = false;
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Có lỗi xảy ra.';
        this.isSending = false;
      }
    });
  }
}
