import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleService } from '../../../core/services/role/role.service';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="title-section">
          <h1>Vai Trò & Quyền Hạn</h1>
          <p>Danh sách các nhóm quyền được định nghĩa trong hệ thống.</p>
        </div>
        <button class="btn-primary">+ Tạo Nhóm Quyền Mới</button>
      </div>

      <div class="glass-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tên Vai Trò</th>
                <th>Mô Tả</th>
                <th>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="isLoading"><td colspan="3" class="text-center">Đang tải...</td></tr>
              <tr *ngFor="let role of roles">
                <td><span class="badge role">{{ role.name }}</span></td>
                <td style="color: var(--text-secondary)">{{ role.description }}</td>
                <td><span class="badge status active">Sẵn sàng</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../../users/user-list/user-list.component.scss']
})
export class RoleListComponent implements OnInit {
  roles: any[] = [];
  isLoading = false;

  constructor(private roleService: RoleService) {}

  ngOnInit() {
    this.isLoading = true;
    this.roleService.getRoles().subscribe(res => {
      if(res.success) {
        this.roles = res.data;
      }
      this.isLoading = false;
    });
  }
}
