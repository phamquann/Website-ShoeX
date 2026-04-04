import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddressService } from '../../../core/services/address/address.service';
import { HttpClient } from '@angular/common/http';

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
        <div class="header-actions">
          <button class="btn-secondary" style="margin-right:12px" (click)="goBack()">← Quay lại</button>
          <button class="btn-primary" (click)="openForm()">+ Thêm Địa Chỉ Mới</button>
        </div>
      </div>

      <div class="address-grid">
        <div *ngIf="isLoading" class="text-center w-full py-10">
          <p style="color:var(--text-secondary)">Đang tải dữ liệu...</p>
        </div>
        <div *ngIf="!isLoading && addresses.length === 0" class="text-center w-full py-10" style="color:var(--text-secondary)">
          Bạn chưa thiết lập địa chỉ nào.
        </div>

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
                <input type="text" [(ngModel)]="currentAddress.fullName" name="fullName" class="form-control" placeholder="Nhập họ và tên" required />
              </div>
              <div class="form-group">
                <label>Số Điện Thoại</label>
                <input type="text" [(ngModel)]="currentAddress.phone" name="phone" class="form-control" placeholder="Nhập số điện thoại" required />
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Tỉnh / Thành Phố</label>
                <select class="form-control" [(ngModel)]="currentAddress.province" (change)="onProvinceChange($event)" name="province" required>
                  <option value="">-- Chọn Tỉnh/Thành --</option>
                  <option *ngFor="let p of provinces" [value]="p.name" [attr.data-id]="p.code">{{ p.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Quận / Huyện</label>
                <select class="form-control" [(ngModel)]="currentAddress.district" (change)="onDistrictChange($event)" name="district" [disabled]="!currentAddress.province" required>
                  <option value="">-- Chọn Quận/Huyện --</option>
                  <option *ngFor="let d of districts" [value]="d.name" [attr.data-id]="d.code">{{ d.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Phường / Xã</label>
                <select class="form-control" [(ngModel)]="currentAddress.ward" name="ward" [disabled]="!currentAddress.district" required>
                  <option value="">-- Chọn Phường/Xã --</option>
                  <option *ngFor="let w of wards" [value]="w.name">{{ w.name }}</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Địa chỉ chi tiết (Số nhà, đường...)</label>
              <input type="text" [(ngModel)]="currentAddress.addressDetail" name="addressDetail" class="form-control" placeholder="Ví dụ: Số 123, đường Láng" required />
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
    .address-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px; padding: 24px; }
    .address-card { background: var(--surface-dark); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; transition: 0.2s; display: flex; flex-direction: column; gap: 12px; }
    .address-card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.3); border-color: rgba(79, 70, 229, 0.3); }
    .address-card.is-default { border-color: var(--primary); background: rgba(79, 70, 229, 0.05); }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .card-header h4 { margin: 0; color: #fff; font-size: 18px; }
    .default-badge { background: var(--primary); color: #fff; font-size: 11px; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .card-body p { color: var(--text-secondary); margin: 4px 0; font-size: 14px; line-height: 1.5; }
    .card-actions { margin-top: auto; padding-top: 16px; border-top: 1px dashed rgba(255,255,255,0.1); display: flex; gap: 16px; }
    .btn-primary { padding: 12px 24px; border-radius: 10px; font-weight: 600; background: var(--primary); color: #fff; border: none; cursor: pointer; }
    .btn-secondary { padding: 12px 24px; border-radius: 10px; font-weight: 600; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; &:hover { background: rgba(255,255,255,0.1); } }
    .header-actions { display: flex; align-items: center; }
    
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
    .modal-content { width: 100%; max-width: 750px; padding: 32px; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    .modal-content h2 { margin-top: 0; margin-bottom: 24px; color: #fff; text-align: center; }
    .form-layout { display: flex; flex-direction: column; gap: 20px; }
    .form-row { display: flex; gap: 16px; }
    .form-group { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    .form-group label { color: var(--text-secondary); font-size: 13px; font-weight: 500; }
    .form-control { padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 14px; }
    .form-control:focus { border-color: var(--primary); outline: none; }
    select.form-control option { background: #1a1a2e; color: #fff; }
    .checkbox-group label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #fff; font-size: 14px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 16px; margin-top: 12px; }
    
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .w-full { width: 100%; }
    .py-10 { padding-top: 40px; padding-bottom: 40px; }
  `]
})
export class AddressListComponent implements OnInit {
  private http = inject(HttpClient);
  private addressService = inject(AddressService);
  private location = inject(Location);

  addresses: any[] = [];
  isLoading = false;
  showForm = false;
  isSaving = false;
  currentAddress: any = this.getEmptyAddress();

  // Vietnam Administrative Units
  provinces: any[] = [];
  districts: any[] = [];
  wards: any[] = [];

  ngOnInit() {
    this.loadAddresses();
    this.loadProvinces();
  }

  goBack() {
    this.location.back();
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

  loadProvinces() {
    this.http.get('https://provinces.open-api.vn/api/?depth=1').subscribe((data: any) => {
      this.provinces = data;
    });
  }

  onProvinceChange(event: any) {
    const provinceName = event.target.value;
    const province = this.provinces.find(p => p.name === provinceName);
    
    this.districts = [];
    this.wards = [];
    this.currentAddress.district = '';
    this.currentAddress.ward = '';

    if (province) {
      this.http.get(`https://provinces.open-api.vn/api/p/${province.code}?depth=2`).subscribe((data: any) => {
        this.districts = data.districts;
      });
    }
  }

  onDistrictChange(event: any) {
    const districtName = event.target.value;
    const district = this.districts.find(d => d.name === districtName);
    
    this.wards = [];
    this.currentAddress.ward = '';

    if (district) {
      this.http.get(`https://provinces.open-api.vn/api/d/${district.code}?depth=2`).subscribe((data: any) => {
        this.wards = data.wards;
      });
    }
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
    // Before opening form, we need to try to load districts/wards if they exist
    this.currentAddress = { ...addr };
    this.showForm = true;
    
    // Attempt to re-populate cascading dropdowns
    if (this.currentAddress.province) {
      const p = this.provinces.find(x => x.name === this.currentAddress.province);
      if (p) {
        this.http.get(`https://provinces.open-api.vn/api/p/${p.code}?depth=2`).subscribe((data: any) => {
          this.districts = data.districts;
          if (this.currentAddress.district) {
            const d = this.districts.find(x => x.name === this.currentAddress.district);
            if (d) {
              this.http.get(`https://provinces.open-api.vn/api/d/${d.code}?depth=2`).subscribe((data2: any) => {
                this.wards = data2.wards;
              });
            }
          }
        });
      }
    }
  }

  saveAddress() {
    this.isSaving = true;
    if (this.currentAddress._id) {
      this.addressService.updateAddress(this.currentAddress._id, this.currentAddress).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadAddresses();
            this.closeForm();
          } else {
            alert(res.message || 'Không thể cập nhật địa chỉ');
          }
          this.isSaving = false;
        },
        error: (err) => {
          alert(err.error?.message || 'Lỗi hệ thống khi cập nhật');
          this.isSaving = false;
        }
      });
    } else {
      this.addressService.createAddress(this.currentAddress).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadAddresses();
            this.closeForm();
          } else {
            alert(res.message || 'Không thể lưu địa chỉ');
          }
          this.isSaving = false;
        },
        error: (err) => {
          if (err.status === 422 && err.error?.errors) {
            const msg = err.error.errors.map((e:any) => e.message).join('\n');
            alert('Lỗi nhập liệu:\n' + msg);
          } else {
            alert(err.error?.message || 'Lỗi hệ thống khi lưu');
          }
          this.isSaving = false;
        }
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
