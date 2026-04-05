import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentService } from '../../../core/services/shipment.service';

@Component({
  selector: 'app-shipment-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shipment-list.component.html',
  styleUrls: ['../../brands/brand-list/brand-list.component.scss']
})
export class ShipmentListComponent implements OnInit {
  shipments: any[] = [];
  showModal = false;
  editingItem: any = null;
  form: any = { status: 'preparing', trackingNumber: '', shippingProvider: '' };

  constructor(private srv: ShipmentService) {}

  ngOnInit() { this.load(); }
  load() { this.srv.getAll().subscribe(res => { if(res.success) this.shipments = res.data; }); }

  openEdit(item: any) {
    this.editingItem = item;
    this.form = {
      status: item.status || 'preparing',
      trackingNumber: item.trackingNumber || '',
      shippingProvider: item.shippingProvider || ''
    };
    this.showModal = true;
  }
  closeModal() { this.showModal = false; }
  save() {
    if (!this.editingItem) return;
    if (!this.form.shippingProvider?.trim() || !this.form.trackingNumber?.trim()) {
      return alert('Shipping provider and tracking number are required');
    }
    this.srv.update(this.editingItem.order?._id || this.editingItem.order, this.form).subscribe(() => { this.closeModal(); this.load(); });
  }
}
