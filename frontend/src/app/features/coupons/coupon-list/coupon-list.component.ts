import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CouponService } from '../../../core/services/coupon.service';

@Component({
  selector: 'app-coupon-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coupon-list.component.html',
  styleUrls: ['../../brands/brand-list/brand-list.component.scss'] // Reusing styles from brand for consistency
})
export class CouponListComponent implements OnInit {
  coupons: any[] = [];
  
  showModal = false;
  editingCoupon: any = null;
  couponForm: any = { code: '', description: '', discountType: 'percentage', discountValue: 0, minOrderValue: 0, maxDiscountAmount: null, startDate: '', endDate: '', usageLimit: null, isActive: true };

  constructor(private couponService: CouponService) {}

  ngOnInit() {
    this.loadCoupons();
  }

  loadCoupons() {
    this.couponService.getCoupons().subscribe({
      next: (res) => {
        if (res.success) {
          this.coupons = res.data;
        }
      },
      error: (err) => {
        alert('Failed to load coupons');
      }
    });
  }

  openAddModal() {
    this.editingCoupon = null;
    this.couponForm = { code: '', description: '', discountType: 'percentage', discountValue: 0, minOrderValue: 0, maxDiscountAmount: null, startDate: '', endDate: '', usageLimit: null, isActive: true };
    this.showModal = true;
  }

  openEditModal(coupon: any) {
    this.editingCoupon = coupon;
    this.couponForm = { 
      code: coupon.code, 
      description: coupon.description, 
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderValue: coupon.minOrderValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      startDate: coupon.startDate.substring(0, 10),
      endDate: coupon.endDate.substring(0, 10),
      usageLimit: coupon.usageLimit,
      isActive: coupon.isActive
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingCoupon = null;
  }

  saveCoupon() {
    if (!this.couponForm.code || !this.couponForm.startDate || !this.couponForm.endDate) {
      alert('Code, Start Date and End Date are required');
      return;
    }

    if (this.editingCoupon) {
      this.couponService.updateCoupon(this.editingCoupon._id, this.couponForm).subscribe({
        next: (res) => {
          alert('Coupon updated successfully');
          this.closeModal();
          this.loadCoupons();
        },
        error: (err) => {
          alert(err.error?.message || 'Update failed');
        }
      });
    } else {
      this.couponService.createCoupon(this.couponForm).subscribe({
        next: (res) => {
          alert('Coupon created successfully');
          this.closeModal();
          this.loadCoupons();
        },
        error: (err) => {
          alert(err.error?.message || 'Create failed');
        }
      });
    }
  }

  deleteCoupon(id: string) {
    if (confirm('Are you sure you want to delete this coupon?')) {
      this.couponService.deleteCoupon(id).subscribe({
        next: (res) => {
          alert('Coupon deleted successfully');
          this.loadCoupons();
        },
        error: (err) => {
          alert('Delete failed');
        }
      });
    }
  }
}
