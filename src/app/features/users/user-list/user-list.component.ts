import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user/user.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  users: any[] = [];
  isLoading = false;
  
  // Pagination & Filtering
  currentPage = 1;
  totalPages = 1;
  limit = 10;
  keyword = '';
  
  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers(this.currentPage, this.limit, this.keyword).subscribe({
      next: (res) => {
        if (res.success) {
          this.users = res.data;
          this.totalPages = res.meta?.totalPages || 1;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching users:', err);
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  toggleStatus(id: string): void {
    if(confirm('Bạn có chắc muốn thay đổi trạng thái user này?')) {
      this.userService.toggleStatus(id).subscribe((res) => {
        if (res.success) {
          this.loadUsers();
        }
      });
    }
  }

  deleteUser(id: string): void {
    if(confirm('Bạn có chắc chắn muốn XÓA user này không?')) {
      this.userService.deleteUser(id).subscribe((res) => {
        if (res.success) {
          this.loadUsers();
        }
      });
    }
  }
}
