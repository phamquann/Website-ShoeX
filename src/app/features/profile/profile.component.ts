import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="title-section">
          <h1>Hồ Sơ Của Tôi</h1>
          <p>Cập nhật thông tin cá nhân và mật khẩu truy cập.</p>
        </div>
      </div>

      <div class="profile-grid">
        <div class="glass-card">
          <h3>Thông Tin Cơ Bản && Avatar</h3>
          <div class="avatar-section">
            <div class="avatar-large" [style.backgroundImage]="'url(' + (profile.avatarUrl || 'http://localhost:3000/uploads/default-avatar.png') + ')'"></div>
            <div class="upload-btn-wrapper">
              <button class="btn-secondary">Đổi Avatar</button>
              <input type="file" (change)="onFileSelected($event)" accept="image/*" />
            </div>
            <span *ngIf="isUploading" class="uploading-text">Đang tải lên...</span>
          </div>

          <form (ngSubmit)="updateProfile()" class="form-layout">
            <div class="form-group">
              <label>Họ và Tên</label>
              <input type="text" [(ngModel)]="profile.fullName" name="fullName" class="form-control" />
            </div>
            <div class="form-group">
              <label>Số điện thoại</label>
              <input type="text" [(ngModel)]="profile.phone" name="phone" class="form-control" />
            </div>
            <button type="submit" class="btn-primary">Lưu Thay Đổi</button>
            <div class="success-msg" *ngIf="profileSuccess">Cập nhật hồ sơ thành công!</div>
          </form>
        </div>

        <div class="glass-card">
          <h3>Đổi Mật Khẩu</h3>
          <form (ngSubmit)="changePassword()" class="form-layout">
            <div class="form-group">
              <label>Mật Khẩu Hiện Tại</label>
              <input type="password" [(ngModel)]="pwd.oldPassword" name="oldPassword" class="form-control" />
            </div>
            <div class="form-group">
              <label>Mật Khẩu Mới</label>
              <input type="password" [(ngModel)]="pwd.newPassword" name="newPassword" class="form-control" />
            </div>
            <button type="submit" class="btn-secondary" style="border-color: var(--error); color: var(--error);">Đổi Mật Khẩu</button>
            <div class="success-msg" *ngIf="pwdSuccess">{{ pwdSuccess }}</div>
            <div class="error-msg" *ngIf="pwdError">{{ pwdError }}</div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .glass-card { background: var(--surface-dark); border: 1px solid rgba(255,255,255,0.05); padding: 24px; border-radius: 16px; margin-top: 24px; }
    .glass-card h3 { color: #fff; margin-bottom: 24px; font-size: 18px; }
    .avatar-section { display: flex; align-items: center; gap: 24px; margin-bottom: 32px; }
    .avatar-large { width: 100px; height: 100px; background-size: cover; background-position: center; border-radius: 50%; border: 3px solid var(--primary); }
    .upload-btn-wrapper { position: relative; overflow: hidden; display: inline-block; }
    .upload-btn-wrapper input[type=file] { font-size: 100px; position: absolute; left: 0; top: 0; opacity: 0; cursor: pointer; }
    .form-layout { display: flex; flex-direction: column; gap: 16px; }
    .form-group label { display: block; margin-bottom: 8px; color: var(--text-secondary); font-size: 14px; }
    .form-control { width: 100%; padding: 12px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; }
    .form-control:focus { border-color: var(--primary); outline: none; }
    .btn-secondary { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .success-msg { color: #34d399; font-size: 14px; margin-top: 12px; }
    .error-msg { color: #f87171; font-size: 14px; margin-top: 12px; }
    .uploading-text { color: var(--primary); font-size: 14px; }
  `],
  styleUrls: ['../users/user-list/user-list.component.scss']
})
export class ProfileComponent implements OnInit {
  profile: any = { fullName: '', phone: '', avatarUrl: '' };
  pwd: any = { oldPassword: '', newPassword: '' };
  
  profileSuccess = false;
  pwdSuccess = '';
  pwdError = '';
  isUploading = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      this.profile.fullName = u.fullName || '';
      this.profile.phone = u.phone || '';
      this.profile.avatarUrl = u.avatarUrl || '';
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploading = true;
      const formData = new FormData();
      formData.append('file', file);
      
      this.http.post<any>('http://localhost:3000/api/v1/uploads/single', formData).subscribe({
        next: (res) => {
          if (res.success) {
            this.profile.avatarUrl = res.data.url;
            this.updateProfile(); // auto-save 
          }
          this.isUploading = false;
        },
        error: () => { this.isUploading = false; }
      });
    }
  }

  updateProfile() {
    const payload: any = {};
    if (this.profile.fullName) payload.fullName = this.profile.fullName;
    if (this.profile.phone) payload.phone = this.profile.phone;
    if (this.profile.avatarUrl) payload.avatarUrl = this.profile.avatarUrl;

    this.http.put<any>('http://localhost:3000/api/v1/auth/me', payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.profileSuccess = true;
          
          // Update local storage
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const u = JSON.parse(userStr);
            u.fullName = this.profile.fullName;
            u.phone = this.profile.phone;
            u.avatarUrl = this.profile.avatarUrl;
            localStorage.setItem('user', JSON.stringify(u));
            // Trigger storage event so layout updates immediately
            window.dispatchEvent(new Event('storage'));
          }
          setTimeout(() => this.profileSuccess = false, 3000);
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Lỗi cập nhật hồ sơ');
      }
    });
  }

  changePassword() {
    this.pwdError = '';
    this.pwdSuccess = '';
    this.http.put<any>('http://localhost:3000/api/v1/auth/change-password', this.pwd).subscribe({
      next: (res) => {
        if (res.success) {
          this.pwdSuccess = res.message;
          this.pwd = { oldPassword: '', newPassword: '' };
        }
      },
      error: (err) => {
        this.pwdError = err.error?.message || 'Lỗi đổi mật khẩu';
      }
    });
  }
}
