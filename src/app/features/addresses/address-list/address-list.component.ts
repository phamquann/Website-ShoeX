import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddressService } from '../../../core/services/address/address.service';

@Component({
  selector: 'app-address-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="title-section">
          <h1>Sổ Địa Chỉ</h1>
          <p>Quản lý các địa chỉ nhận hàng của bạn.</p>
        </div>
        <button class="btn-primary" (click)="openForm()">+ Thêm Địa Chỉ Mới</button>
      </div>

      <div class="glass-card address-grid">
        <div *ngIf="isLoading" class="text-center">Đang tải dữ liệu...</div>
        <div *ngIf="!isLoading && addresses.length === 0" class="text-center" style="color:var(--text-secondary)">Bạn chưa thiết lập địa chỉ nào.</div>

        <div class="address-card" *ngFor="let addr of addresses" [class.is-default]="addr.isDefault">
          <div class="card-header">
            <h4>{{ addr.fullName }}</h4>
            <span class="badge default-badge" *ngIf="addr.isDefault">Mặc định</span>
          </div>
          <div class="card-body">
            <p><strong>Số điện thoại:</strong> {{ addr.phone }}</p>
            <p><strong>Địa chỉ:</strong> {{ addr.addressDetail }}, {{ addr.ward }}, {{ addr.district }}, {{ addr.province }}</p>
          </div>
          <div class="card-actions">
            <button class="btn-text" style="color:var(--primary)" (click)="editAddress(addr)">Sửa</button>
            <button class="btn-text" style="color:var(--error)" *ngIf="!addr.isDefault" (click)="deleteAddress(addr._id)">Xóa</button>
          </div>
        </div>
      </div>

      <!-- Modal Form -->
      <div class="modal-overlay" *ngIf="showForm">
        <div class="modal-content glass-card">
          <h2>{{ currentAddress._id ? 'Cập Nhật Địa Chỉ' : 'Thêm Địa Chỉ Mới' }}</h2>
          <form (ngSubmit)="saveAddress()" class="form-layout">
            <div class="form-row">
              <div class="form-group">
                <label>Họ và Tên</label>
                <input type="text" [(ngModel)]="currentAddress.fullName" name="fullName" class="form-control" required />
              </div>
              <div class="form-group">
                <label>Số Điện Thoại</label>
                <input type="text" [(ngModel)]="currentAddress.phone" name="phone" class="form-control" required />
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Tỉnh / Thành Phố</label>
                <input type="text" [(ngModel)]="currentAddress.province" name="province" class="form-control" required />
              </div>
              <div class="form-group">
                <label>Quận / Huyện</label>
                <input type="text" [(ngModel)]="currentAddress.district" name="district" class="form-control" required />
              </div>
              <div class="form-group">
                <label>Phường / Xã</label>
                <input type="text" [(ngModel)]="currentAddress.ward" name="ward" class="form-control" required />
              </div>
            </div>

            <div class="form-group">
              <label>Địa chỉ chi tiết (Số nhà, đường...)</label>
              <input type="text" [(ngModel)]="currentAddress.addressDetail" name="addressDetail" class="form-control" required />
            </div>

            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" [(ngModel)]="currentAddress.isDefault" name="isDefault" />
                Đặt làm địa chỉ mặc định
              </label>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-text" (click)="closeForm()">Hủy Bỏ</button>
              <button type="submit" class="btn-primary" [disabled]="isSaving">{{ isSaving ? 'Đang Lưu...' : 'Lưu Khu Vực' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .address-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px; padding: 24px; background: transparent; border: none; }
    .address-card { background: var(--surface-dark); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; transition: 0.2s; display: flex; flex-direction: column; gap: 12px; }
    .address-card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.3); border-color: rgba(79, 70, 229, 0.3); }
    .address-card.is-default { border-color: var(--primary); background: rgba(79, 70, 229, 0.05); }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .card-header h4 { margin: 0; color: #fff; font-size: 18px; }
    .default-badge { background: var(--primary); color: #fff; font-size: 11px; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .card-body p { color: var(--text-secondary); margin: 4px 0; font-size: 14px; line-height: 1.5; }
    .card-actions { margin-top: auto; padding-top: 16px; border-top: 1px dashed rgba(255,255,255,0.1); display: flex; gap: 16px; }
    .btn-text { background: transparent; border: none; font-weight: 600; cursor: pointer; transition: 0.2s; padding: 0; }
    .btn-text:hover { filter: brightness(1.3); }
    
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .modal-content { width: 100%; max-width: 600px; padding: 32px; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    .modal-content h2 { margin-top: 0; margin-bottom: 24px; color: #fff; }
    .form-layout { display: flex; flex-direction: column; gap: 20px; }
    .form-row { display: flex; gap: 16px; }
    .form-group { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    .form-group label { color: var(--text-secondary); font-size: 13px; font-weight: 500; }
    .form-control { padding: 12px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 14px; }
    .form-control:focus { border-color: var(--primary); outline: none; }
    .checkbox-group label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #fff; font-size: 14px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 16px; margin-top: 12px; }
    
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `],
  styleUrls: ['../../users/user-list/user-list.component.scss']
})
export class AddressListComponent implements OnInit {
  addresses: any[] = [];
  isLoading = false;
  showForm = false;
  isSaving = false;
  currentAddress: any = this.getEmptyAddress();

  constructor(private addressService: AddressService) {}

  ngOnInit() {
    this.loadAddresses();
  }

  loadAddresses() {
    this.isLoading = true;
    this.addressService.getAddresses().subscribe(res => {
      if (res.success) {
        this.addresses = res.data;
      }
      this.isLoading = false;
    });
  }

  getEmptyAddress() {
    return { fullName: '', phone: '', province: '', district: '', ward: '', addressDetail: '', isDefault: false };
  }

  openForm() {
    this.currentAddress = this.getEmptyAddress();
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
  }

  editAddress(addr: any) {
    this.currentAddress = { ...addr };
    this.showForm = true;
  }

  saveAddress() {
    this.isSaving = true;
    if (this.currentAddress._id) {
      this.addressService.updateAddress(this.currentAddress._id, this.currentAddress).subscribe({
        next: (res) => {
          if (res.success) this.loadAddresses();
          this.isSaving = false;
          this.closeForm();
        },
        error: () => this.isSaving = false
      });
    } else {
      this.addressService.createAddress(this.currentAddress).subscribe({
        next: (res) => {
          if (res.success) this.loadAddresses();
          this.isSaving = false;
          this.closeForm();
        },
        error: () => this.isSaving = false
      });
    }
  }

  deleteAddress(id: string) {
    if (confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) {
      this.addressService.deleteAddress(id).subscribe(res => {
        if (res.success) this.loadAddresses();
      });
    }
  }
}
