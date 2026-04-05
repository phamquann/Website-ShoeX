import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../../core/services/cart/cart.service';
import { CheckoutService } from '../../../core/services/checkout/checkout.service';
import { AddressService } from '../../../core/services/address/address.service';
import { CouponService } from '../../../core/services/coupon.service';
import { v4 as uuidv4 } from 'uuid'; // We might need to map this or just generate a random string

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  cart: any = null;
  addresses: any[] = [];
  selectedAddressId: string = '';
  paymentMethod: string = 'cod';
  note: string = '';

  couponCode: string = '';
  appliedCoupon: string = '';
  discountAmount: number = 0;

  isLoading = true;
  isProcessing = false;

  constructor(
    private cartService: CartService,
    private checkoutService: CheckoutService,
    private addressService: AddressService,
    private couponService: CouponService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;

    // Load Addresses
    this.addressService.getAddresses().subscribe({
      next: (res) => {
        if (res.success) {
          this.addresses = res.data;

          if (this.addresses.length === 0) {
            alert('Bạn chưa có địa chỉ giao hàng. Vui lòng thêm địa chỉ để tiếp tục thanh toán!');
            this.router.navigate(['/addresses']);
            return;
          }

          // select default address if exists
          const defaultAddr = this.addresses.find(a => a.isDefault);
          if (defaultAddr) this.selectedAddressId = defaultAddr._id;
          else if (this.addresses.length > 0) this.selectedAddressId = this.addresses[0]._id;
        }
      }
    });

    // Load Cart
    this.cartService.getMyCart().subscribe({
      next: (res) => {
        if (res.success) {
          this.cart = res.data;
          if (!this.cart || this.cart.items.length === 0) {
            alert('Your cart is empty');
            this.router.navigate(['/cart']);
          }
        }
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  generateIdempotencyKey() {
    return 'idemp_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  applyCoupon() {
    if (!this.couponCode) return;
    this.couponService.checkCoupon({ code: this.couponCode, orderValue: this.cart?.totalAmount || 0 }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.discountAmount = res.data.discountAmount;
          this.appliedCoupon = this.couponCode;
        }
      },
      error: (err: any) => {
        alert(err.error?.message || 'Mã giảm giá không hợp lệ');
        this.discountAmount = 0;
        this.appliedCoupon = '';
      }
    });
  }

  placeOrder() {
    if (!this.selectedAddressId) {
      alert('Please select a shipping address');
      return;
    }

    this.isProcessing = true;
    const payload = {
      addressId: this.selectedAddressId,
      paymentMethod: this.paymentMethod,
      note: this.note,
      couponCode: this.appliedCoupon,
      idempotencyKey: this.generateIdempotencyKey()
    };

    this.checkoutService.checkout(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.cartService.updateCartCount(0); // Clear cart badge
          alert('Đặt hàng thành công!');
          this.router.navigate(['/orders']); 
        }
        this.isProcessing = false;
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Thanh toán thất bại không rõ lý do';
        alert('Lỗi: ' + msg);
        this.isProcessing = false;
      }
    });
  }
}
