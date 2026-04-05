import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { OrderService } from '../../../core/services/order/order.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss']
})
export class OrderDetailComponent implements OnInit {
  orderData: any = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadOrder(id);
    }
  }

  loadOrder(id: string) {
    this.isLoading = true;
    this.orderService.getOrderById(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.orderData = res.data;
        }
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  getStatusClass(status: string) {
    switch(status) {
      case 'pending': return 'badge-warning';
      case 'confirmed': return 'badge-info';
      case 'shipping': return 'badge-primary';
      case 'delivered': return 'badge-success';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }
}
