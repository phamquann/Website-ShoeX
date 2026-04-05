import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RefundService } from '../../../core/services/refund.service';
import { ReturnRequestService } from '../../../core/services/return-request.service';

@Component({
  selector: 'app-return-request-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './return-request-list.component.html',
  styleUrls: ['./return-request-list.component.scss']
})
export class ReturnRequestListComponent implements OnInit {
  requests: any[] = [];
  isAdmin = false;
  isLoading = false;

  reviewNotes: Record<string, string> = {};
  refundNotes: Record<string, string> = {};
  refundTransactionIds: Record<string, string> = {};
  actionLoading: Record<string, boolean> = {};

  constructor(
    private returnRequestService: ReturnRequestService,
    private refundService: RefundService
  ) {}

  ngOnInit() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.isAdmin = user.role?.name === 'ADMIN' || user.role?.name === 'STAFF';
    }

    this.load();
  }

  load() {
    this.isLoading = true;
    this.returnRequestService.getAll().subscribe({
      next: (res) => {
        this.requests = res.success ? res.data : [];
        this.seedDraftValues();
        this.isLoading = false;
      },
      error: () => {
        this.requests = [];
        this.isLoading = false;
      }
    });
  }

  private seedDraftValues() {
    for (const item of this.requests) {
      this.reviewNotes[item._id] = this.reviewNotes[item._id] ?? (item.adminNote || '');

      if (item.refund?._id) {
        this.refundNotes[item.refund._id] = this.refundNotes[item.refund._id] ?? (item.refund.adminNote || '');
        this.refundTransactionIds[item.refund._id] = this.refundTransactionIds[item.refund._id] ?? (item.refund.transactionId || '');
      }
    }
  }

  private setActionLoading(key: string, value: boolean) {
    this.actionLoading[key] = value;
  }

  isActionBusy(key: string) {
    return !!this.actionLoading[key];
  }

  getReasonLabel(reason: string) {
    switch (reason) {
      case 'wrong_size': return 'Khong vua kich thuoc';
      case 'wrong_item': return 'Giao sai san pham';
      case 'damaged_item': return 'San pham loi / hong';
      case 'not_as_expected': return 'Khong giong mo ta';
      case 'other': return 'Ly do khac';
      default: return reason || 'Khong ro';
    }
  }

  getRequestStatusLabel(status: string) {
    switch (status) {
      case 'pending': return 'Cho duyet';
      case 'approved': return 'Da chap nhan';
      case 'rejected': return 'Da tu choi';
      case 'completed': return 'Da hoan tat';
      default: return status || 'Khong ro';
    }
  }

  getRequestStatusClass(status: string) {
    switch (status) {
      case 'pending': return 'pending';
      case 'approved': return 'approved';
      case 'rejected': return 'rejected';
      case 'completed': return 'completed';
      default: return 'neutral';
    }
  }

  getRefundStatusLabel(status: string) {
    switch (status) {
      case 'pending': return 'Cho xu ly';
      case 'processing': return 'Dang hoan tien';
      case 'completed': return 'Da hoan tien';
      case 'failed': return 'Loi hoan tien';
      default: return status || 'Chua tao refund';
    }
  }

  getRefundStatusClass(status: string) {
    switch (status) {
      case 'pending': return 'pending';
      case 'processing': return 'processing';
      case 'completed': return 'approved';
      case 'failed': return 'rejected';
      default: return 'neutral';
    }
  }

  getRefundMethodLabel(method: string) {
    return method === 'cash' ? 'Tien mat' : 'Chuyen khoan';
  }

  getPaymentMethodLabel(method: string) {
    return method === 'cod' ? 'Thanh toan khi nhan hang' : 'Thanh toan online';
  }

  getUserName(item: any) {
    return item.user?.fullName || item.user?.username || 'Khach hang';
  }

  getUserContact(item: any) {
    return item.user?.phone || item.user?.email || 'Chua co thong tin lien he';
  }

  getShippingAddress(order: any) {
    const address = order?.shippingAddress;
    if (!address) {
      return 'Chua co dia chi giao hang';
    }

    return [
      address.addressDetail,
      address.ward,
      address.district,
      address.province
    ].filter(Boolean).join(', ');
  }

  getVariantSummary(item: any) {
    const parts = [];
    if (item?.variantInfo?.size) parts.push(`Size ${item.variantInfo.size}`);
    if (item?.variantInfo?.color) parts.push(`Mau ${item.variantInfo.color}`);
    if (item?.variantInfo?.sku) parts.push(`SKU ${item.variantInfo.sku}`);
    return parts.join(' · ') || 'Khong co thong tin phan loai';
  }

  reviewRequest(item: any, status: 'approved' | 'rejected') {
    if (!this.isAdmin || this.isActionBusy(item._id)) {
      return;
    }

    const adminNote = (this.reviewNotes[item._id] || '').trim();
    if (status === 'rejected' && !adminNote) {
      alert('Vui long nhap ly do tu choi truoc khi gui phan hoi.');
      return;
    }

    if (!confirm(status === 'approved' ? 'Chap nhan yeu cau nay?' : 'Tu choi yeu cau nay?')) {
      return;
    }

    this.setActionLoading(item._id, true);
    this.returnRequestService.updateStatus(item._id, { status, adminNote }).subscribe({
      next: () => this.load(),
      error: (err) => {
        alert(err.error?.message || 'Khong the cap nhat yeu cau hoan hang.');
        this.setActionLoading(item._id, false);
      }
    });
  }

  updateRefundStatus(item: any, status: 'processing' | 'completed' | 'failed') {
    const refund = item.refund;
    if (!refund || this.isActionBusy(refund._id)) {
      return;
    }

    const adminNote = (this.refundNotes[refund._id] || '').trim();
    const transactionId = (this.refundTransactionIds[refund._id] || '').trim();

    if (status === 'completed' && !transactionId) {
      alert('Vui long nhap ma giao dich hoan tien.');
      return;
    }

    if (status === 'failed' && !adminNote) {
      alert('Vui long nhap ly do loi hoan tien de thong bao cho khach.');
      return;
    }

    if (!confirm('Cap nhat tien trinh hoan tien cho yeu cau nay?')) {
      return;
    }

    this.setActionLoading(refund._id, true);
    this.refundService.updateStatus(refund._id, { status, transactionId, adminNote }).subscribe({
      next: () => this.load(),
      error: (err) => {
        alert(err.error?.message || 'Khong the cap nhat hoan tien.');
        this.setActionLoading(refund._id, false);
      }
    });
  }
}
