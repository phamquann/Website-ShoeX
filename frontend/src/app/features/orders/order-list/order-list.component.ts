import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order/order.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.scss']
})
export class OrderListComponent implements OnInit {
  orders: any[] = [];
  isLoading = true;
  isAdmin = false;
  completingOrderId = '';
  
  meta: any = {};
  currentPage = 1;
  statusFilter = '';
  searchQuery = '';

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.isAdmin = user.role?.name === 'ADMIN' || user.role?.name === 'STAFF';
    }
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    const params = {
      page: this.currentPage,
      limit: 10,
      status: this.statusFilter,
      search: this.searchQuery
    };

    const request = this.isAdmin 
      ? this.orderService.getAllOrders(params)
      : this.orderService.getMyOrders(params);

    request.subscribe({
      next: (res) => {
        if (res.success) {
          this.orders = res.data;
          this.meta = res.meta;
        }
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadOrders();
  }

  changePage(page: number) {
    if (page < 1 || page > this.meta.totalPages) return;
    this.currentPage = page;
    this.loadOrders();
  }

  getStatusClass(status: string) {
    switch(status) {
      case 'pending': return 'badge-warning';
      case 'confirmed': return 'badge-info';
      case 'shipping': return 'badge-primary';
      case 'delivered': return 'badge-success';
      case 'completed': return 'badge-info';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  confirmReceived(order: any) {
    if (this.isAdmin || order.status !== 'delivered') return;

    if (!confirm('Xác nhận bạn đã nhận được đơn hàng này?')) {
      return;
    }

    this.completingOrderId = order._id;
    this.orderService.confirmReceived(order._id).subscribe({
      next: (res) => {
        if (res.success) {
          alert('Đã xác nhận nhận hàng. Bạn có thể bấm Đánh giá sản phẩm.');
          this.loadOrders();
        }
        this.completingOrderId = '';
      },
      error: (err) => {
        alert(err.error?.message || 'Không thể xác nhận nhận hàng');
        this.completingOrderId = '';
      }
    });
  }

  updateStatus(order: any, newStatus: string) {
    if (!this.isAdmin) return;
    if (confirm(`Change order status to ${newStatus.toUpperCase()}?`)) {
      this.orderService.updateOrderStatus(order._id, newStatus).subscribe({
        next: (res) => {
          if (res.success) {
            order.status = newStatus;
            alert('Status updated');
          }
        },
        error: (err) => alert(err.error?.message || 'Update failed')
      });
    }
  }
}
