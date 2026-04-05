import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CartService } from '../../../core/services/cart/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {
  cart: any = null;
  isLoading = true;

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart() {
    this.isLoading = true;
    this.cartService.getMyCart().subscribe({
      next: (res) => {
        if (res.success) {
          this.cart = res.data;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load cart', err);
        this.isLoading = false;
      }
    });
  }

  updateQuantity(itemId: string, newQuantity: number) {
    if (newQuantity < 1) return;
    this.cartService.updateItem(itemId, newQuantity).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadCart();
        }
      },
      error: (err) => alert(err.error?.message || 'Failed to update quantity')
    });
  }

  removeItem(itemId: string) {
    if (confirm('Are you sure you want to remove this item?')) {
      this.cartService.removeItem(itemId).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadCart();
          }
        },
        error: (err) => alert(err.error?.message || 'Failed to remove item')
      });
    }
  }

  clearCart() {
    if (confirm('Are you sure you want to clear your cart?')) {
      this.cartService.clearCart().subscribe({
        next: (res) => {
          if (res.success) {
            this.cart = null;
            this.cartService.updateCartCount(0);
          }
        },
        error: (err) => alert(err.error?.message || 'Failed to clear cart')
      });
    }
  }
}
