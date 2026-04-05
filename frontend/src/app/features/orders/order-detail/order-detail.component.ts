import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { OrderService } from '../../../core/services/order/order.service';
import { ReturnRequestService } from '../../../core/services/return-request.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss']
})
export class OrderDetailComponent implements OnInit {
  orderId = '';
  orderData: any = null;
  isLoading = true;
  userRole = '';
  autoOpenReturnRequest = false;

  showReturnModal = false;
  isSubmittingReturn = false;
  isUploadingImages = false;
  isConfirmingReceived = false;
  uploadedImages: string[] = [];

  returnForm: any = {
    reason: 'wrong_size',
    description: '',
    contactPhone: '',
    refundMethod: 'bank_transfer',
    refundBankName: '',
    refundAccountName: '',
    refundAccountNumber: '',
    requestedAmount: 0
  };

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private returnRequestService: ReturnRequestService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.userRole = user.role?.name || '';
    }

    this.autoOpenReturnRequest = this.route.snapshot.queryParamMap.get('action') === 'return';
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.orderId = id;
      this.loadOrder(id);
    }
  }

  get order(): any {
    return this.orderData?.order || null;
  }

  get shipment(): any {
    return this.orderData?.shipment || null;
  }

  get returnRequest(): any {
    return this.orderData?.returnRequest || null;
  }

  get refund(): any {
    return this.orderData?.refund || null;
  }

  get trackingSteps() {
    const order = this.order;
    if (!order) {
      return [];
    }

    const preparedActive = order.status === 'confirmed';
    const shippingActive = order.status === 'shipping' || ['picked_up', 'delivering'].includes(this.shipment?.status);
    const deliveredDone = order.status === 'delivered' || order.status === 'completed' || this.shipment?.status === 'delivered';

    return [
      {
        key: 'placed',
        label: 'Da dat hang',
        description: 'Don hang da duoc ghi nhan',
        completed: true,
        active: order.status === 'pending',
        time: order.createdAt
      },
      {
        key: 'prepared',
        label: 'Dang chuan bi',
        description: this.shipment?.shippingProvider ? `Don vi: ${this.shipment.shippingProvider}` : 'Kho dang xu ly don',
        completed: ['confirmed', 'shipping', 'delivered', 'completed'].includes(order.status),
        active: preparedActive,
        time: ['confirmed', 'shipping', 'delivered', 'completed'].includes(order.status) ? (this.shipment?.createdAt || order.updatedAt) : null
      },
      {
        key: 'shipping',
        label: 'Dang giao hang',
        description: this.shipment?.trackingNumber ? `Ma van don ${this.shipment.trackingNumber}` : 'Chua co ma van don',
        completed: ['shipping', 'delivered', 'completed'].includes(order.status) || ['picked_up', 'delivering', 'delivered'].includes(this.shipment?.status),
        active: shippingActive,
        time: ['shipping', 'delivered', 'completed'].includes(order.status) ? (this.shipment?.updatedAt || order.updatedAt) : null
      },
      {
        key: 'delivered',
        label: 'Da giao hang',
        description: order.status === 'completed' ? 'Khach hang da xac nhan da nhan hang' : (deliveredDone ? 'Khach hang da nhan duoc don' : 'Dang cho giao thanh cong'),
        completed: deliveredDone,
        active: false,
        time: deliveredDone ? (this.shipment?.updatedAt || order.updatedAt) : null
      }
    ];
  }

  loadOrder(id: string) {
    this.isLoading = true;
    this.orderService.getOrderById(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.orderData = res.data;
          this.setDefaultReturnForm();
          if (this.autoOpenReturnRequest && this.canCreateReturnRequest()) {
            this.showReturnModal = true;
            this.autoOpenReturnRequest = false;
          }
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  setDefaultReturnForm() {
    if (!this.order) {
      return;
    }

    this.returnForm.contactPhone = this.order.shippingAddress?.phone || '';
    this.returnForm.requestedAmount = this.order.totalAmount || 0;
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'confirmed': return 'badge-info';
      case 'shipping': return 'badge-primary';
      case 'delivered': return 'badge-success';
      case 'completed': return 'badge-info';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getStatusLabel(status: string) {
    switch (status) {
      case 'pending': return 'Cho xac nhan';
      case 'confirmed': return 'Da xac nhan';
      case 'shipping': return 'Dang giao';
      case 'delivered': return 'Da giao';
      case 'completed': return 'Da nhan hang';
      case 'cancelled': return 'Da huy';
      default: return status || 'Khong ro';
    }
  }

  getShipmentStatusLabel(status: string) {
    switch (status) {
      case 'preparing': return 'Dang chuan bi';
      case 'picked_up': return 'Da lay hang';
      case 'delivering': return 'Dang giao';
      case 'delivered': return 'Da giao';
      case 'failed': return 'Co su co';
      default: return 'Dang chuan bi';
    }
  }

  getReturnStatusLabel(status: string) {
    switch (status) {
      case 'pending': return 'Dang cho duyet';
      case 'approved': return 'Da chap nhan';
      case 'rejected': return 'Da tu choi';
      case 'completed': return 'Da hoan tat';
      default: return status || 'Chua co';
    }
  }

  getRefundStatusLabel(status: string) {
    switch (status) {
      case 'pending': return 'Cho xu ly';
      case 'processing': return 'Dang hoan tien';
      case 'completed': return 'Da hoan tien';
      case 'failed': return 'That bai';
      default: return status || 'Chua co';
    }
  }

  getPaymentMethodLabel(method: string) {
    return method === 'cod' ? 'Thanh toan khi nhan hang' : 'Thanh toan online';
  }

  getReturnReasonLabel(reason: string) {
    switch (reason) {
      case 'wrong_size': return 'Khong vua kich thuoc';
      case 'wrong_item': return 'Giao sai san pham';
      case 'damaged_item': return 'San pham loi / hong';
      case 'not_as_expected': return 'Khong giong mo ta';
      case 'other': return 'Ly do khac';
      default: return reason || 'Khong ro';
    }
  }

  getSubtotal() {
    return (this.order?.items || []).reduce((total: number, item: any) => total + (item.subtotal || 0), 0);
  }

  canCreateReturnRequest() {
    return this.userRole === 'CUSTOMER' && (this.order?.status === 'delivered' || this.order?.status === 'completed') && !this.returnRequest;
  }

  canConfirmReceived() {
    return this.userRole === 'CUSTOMER' && this.order?.status === 'delivered';
  }

  canReviewOrder() {
    return this.userRole === 'CUSTOMER' && this.order?.status === 'completed' && this.order?.isReceivedConfirmed;
  }

  confirmReceived() {
    if (!this.canConfirmReceived() || this.isConfirmingReceived || !this.orderId) {
      return;
    }

    if (!confirm('Xác nhận bạn đã nhận hàng thành công?')) {
      return;
    }

    this.isConfirmingReceived = true;
    this.orderService.confirmReceived(this.orderId).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadOrder(this.orderId);
          alert('Đã xác nhận nhận hàng. Bạn có thể bấm Đánh giá sản phẩm.');
        }
        this.isConfirmingReceived = false;
      },
      error: (err) => {
        alert(err.error?.message || 'Không thể xác nhận nhận hàng');
        this.isConfirmingReceived = false;
      }
    });
  }

  openReturnRequestModal() {
    if (!this.canCreateReturnRequest()) {
      return;
    }
    this.uploadedImages = [];
    this.returnForm.reason = 'wrong_size';
    this.returnForm.description = '';
    this.returnForm.refundMethod = 'bank_transfer';
    this.returnForm.refundBankName = '';
    this.returnForm.refundAccountName = '';
    this.returnForm.refundAccountNumber = '';
    this.setDefaultReturnForm();
    this.showReturnModal = true;
  }

  closeReturnRequestModal() {
    this.showReturnModal = false;
  }

  onReturnImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) {
      return;
    }

    this.isUploadingImages = true;
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('type', 'other');

    this.http.post<any>('http://localhost:3000/api/v1/uploads/multiple', formData).subscribe({
      next: (res) => {
        if (res.success) {
          const urls = (res.data || []).map((item: any) => item.url).filter(Boolean);
          this.uploadedImages = [...this.uploadedImages, ...urls];
        }
        this.isUploadingImages = false;
        input.value = '';
      },
      error: (err) => {
        alert(err.error?.message || 'Khong the tai anh len');
        this.isUploadingImages = false;
        input.value = '';
      }
    });
  }

  removeImage(index: number) {
    this.uploadedImages.splice(index, 1);
    this.uploadedImages = [...this.uploadedImages];
  }

  submitReturnRequest() {
    if (!this.orderId || this.isSubmittingReturn) {
      return;
    }

    if (!this.returnForm.reason) {
      return alert('Vui long chon ly do hoan hang');
    }

    if (!this.returnForm.contactPhone?.trim()) {
      return alert('Vui long nhap so dien thoai lien he');
    }

    if (this.returnForm.refundMethod === 'bank_transfer') {
      if (!this.returnForm.refundBankName?.trim() || !this.returnForm.refundAccountName?.trim() || !this.returnForm.refundAccountNumber?.trim()) {
        return alert('Vui long nhap day du thong tin tai khoan nhan tien');
      }
    }

    this.isSubmittingReturn = true;
    const payload = {
      order: this.orderId,
      reason: this.returnForm.reason,
      description: this.returnForm.description,
      images: this.uploadedImages,
      contactPhone: this.returnForm.contactPhone,
      refundMethod: this.returnForm.refundMethod,
      refundBankName: this.returnForm.refundBankName,
      refundAccountName: this.returnForm.refundAccountName,
      refundAccountNumber: this.returnForm.refundAccountNumber,
      requestedAmount: this.returnForm.requestedAmount
    };

    this.returnRequestService.create(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.showReturnModal = false;
          this.uploadedImages = [];
          this.loadOrder(this.orderId);
          alert('Yeu cau hoan hang da duoc gui. Admin se phan hoi trong 1-3 ngay.');
        }
        this.isSubmittingReturn = false;
      },
      error: (err) => {
        alert(err.error?.message || 'Khong the gui yeu cau hoan hang');
        this.isSubmittingReturn = false;
      }
    });
  }
}
