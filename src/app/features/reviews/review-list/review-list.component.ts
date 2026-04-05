import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReviewService } from '../../../core/services/review.service';

interface ReviewableItem {
  orderId: string;
  orderCode: string;
  productId: string;
  productName: string;
  thumbnail: string;
  quantity: number;
  price: number;
}

@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './review-list.component.html',
  styleUrls: ['./review-list.component.scss', '../../brands/brand-list/brand-list.component.scss']
})
export class ReviewListComponent implements OnInit, OnDestroy {
  reviews: any[] = [];
  reviewableItems: ReviewableItem[] = [];

  editingReview: any = null;
  selectedTarget: ReviewableItem | null = null;

  form: { rating: number; comment: string } = { rating: 5, comment: '' };
  createForm: { rating: number; comment: string } = { rating: 5, comment: '' };

  showModal = false;
  showCreateModal = false;
  isCreating = false;
  isLoadingReviewable = false;

  selectedFiles: File[] = [];
  previewUrls: string[] = [];

  constructor(private srv: ReviewService) {}

  ngOnInit() {
    this.load();
    this.loadReviewable();
  }

  ngOnDestroy() {
    this.revokePreviewUrls();
  }

  load() {
    this.srv.getMyReviews().subscribe((res) => {
      if (res.success) {
        this.reviews = Array.isArray(res.data) ? res.data : [];
      }
    });
  }

  loadReviewable() {
    this.isLoadingReviewable = true;
    this.srv.getReviewableItems({ reviewed: 'false', page: 1, limit: 50 }).subscribe({
      next: (res) => {
        if (res.success) {
          const orders = Array.isArray(res.data) ? res.data : [];
          this.reviewableItems = orders.flatMap((order: any) => {
            const items = Array.isArray(order.items) ? order.items : [];
            return items.map((item: any) => ({
              orderId: `${order.orderId || ''}`,
              orderCode: `${order.orderCode || ''}`,
              productId: `${item.productId || ''}`,
              productName: item.productName,
              thumbnail: item.thumbnail,
              quantity: Number(item.quantity || 1),
              price: Number(item.price || 0)
            }));
          });
        }
        this.isLoadingReviewable = false;
      },
      error: () => {
        this.isLoadingReviewable = false;
      }
    });
  }

  deleteItem(id: string) {
    if (confirm('Xóa đánh giá này?')) {
      this.srv.deleteReview(id).subscribe(() => {
        this.load();
      });
    }
  }

  openEdit(item: any) {
    this.editingReview = item;
    this.form = {
      rating: Number(item.rating || 5),
      comment: item.comment || ''
    };
    this.showModal = true;
  }

  openCreate(item: ReviewableItem) {
    this.selectedTarget = item;
    this.createForm = { rating: 5, comment: '' };
    this.clearSelectedFiles();
    this.showCreateModal = true;
  }

  onSelectFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    const incoming = Array.from(input.files || []);
    if (incoming.length === 0) {
      return;
    }

    const merged = [...this.selectedFiles, ...incoming];
    if (merged.length > 5) {
      alert('Bạn chỉ được chọn tối đa 5 ảnh cho mỗi đánh giá.');
    }

    this.selectedFiles = merged.slice(0, 5);
    this.refreshPreviewUrls();
    input.value = '';
  }

  removeSelectedFile(index: number) {
    if (index < 0 || index >= this.selectedFiles.length) {
      return;
    }

    this.selectedFiles.splice(index, 1);
    this.selectedFiles = [...this.selectedFiles];
    this.refreshPreviewUrls();
  }

  submitCreate() {
    if (!this.selectedTarget || this.isCreating) {
      return;
    }

    const rating = Number(this.createForm.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      alert('Số sao phải là số nguyên từ 1 đến 5.');
      return;
    }

    const payload = new FormData();
    payload.append('productId', this.selectedTarget.productId);
    payload.append('orderId', this.selectedTarget.orderId);
    payload.append('rating', `${rating}`);

    const comment = this.createForm.comment?.trim() || '';
    if (comment) {
      payload.append('comment', comment);
    }

    this.selectedFiles.forEach((file) => payload.append('images', file));

    this.isCreating = true;
    this.srv.createReview(payload).subscribe({
      next: (res) => {
        if (res.success) {
          alert('Đánh giá sản phẩm thành công!');
          this.closeCreateModal();
          this.load();
          this.loadReviewable();
        }
        this.isCreating = false;
      },
      error: (err) => {
        alert(err.error?.message || 'Không thể gửi đánh giá.');
        this.isCreating = false;
      }
    });
  }

  closeModal() {
    this.showModal = false;
    this.editingReview = null;
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.selectedTarget = null;
    this.createForm = { rating: 5, comment: '' };
    this.clearSelectedFiles();
  }

  save() {
    const rating = Number(this.form.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      alert('Số sao phải là số nguyên từ 1 đến 5.');
      return;
    }

    this.srv.updateReview(this.editingReview._id, {
      rating,
      comment: this.form.comment || ''
    }).subscribe(() => {
      this.closeModal();
      this.load();
    });
  }

  getStars(rating: number): number[] {
    const safe = Math.max(0, Math.min(5, Math.floor(Number(rating || 0))));
    return Array.from({ length: safe }, (_, i) => i);
  }

  getReviewDate(item: any): string {
    return item?.created_at || item?.createdAt || '';
  }

  private clearSelectedFiles() {
    this.selectedFiles = [];
    this.revokePreviewUrls();
    this.previewUrls = [];
  }

  private refreshPreviewUrls() {
    this.revokePreviewUrls();
    this.previewUrls = this.selectedFiles.map((file) => URL.createObjectURL(file));
  }

  private revokePreviewUrls() {
    this.previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }
}
