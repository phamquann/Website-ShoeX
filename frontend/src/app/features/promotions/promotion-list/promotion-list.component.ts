import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromotionService } from '../../../core/services/promotion.service';

@Component({
  selector: 'app-promotion-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promotion-list.component.html',
  styleUrls: ['../../brands/brand-list/brand-list.component.scss']
})
export class PromotionListComponent implements OnInit {
  promotions: any[] = [];
  showModal = false;
  editingPromotion: any = null;
  form: any = { name: '', type: 'product', discountType: 'percentage', discountValue: 0, startDate: '', endDate: '', isActive: true };

  constructor(private srv: PromotionService) {}

  ngOnInit() { this.load(); }

  load() {
    this.srv.getPromotions().subscribe(res => { if(res.success) this.promotions = res.data; });
  }

  openAddModal() {
    this.editingPromotion = null;
    this.form = { name: '', type: 'product', discountType: 'percentage', discountValue: 0, startDate: '', endDate: '', isActive: true };
    this.showModal = true;
  }

  openEditModal(item: any) {
    this.editingPromotion = item;
    this.form = { ...item, startDate: item.startDate.substring(0, 10), endDate: item.endDate.substring(0, 10) };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  save() {
    if(!this.form.name) return alert('Name required');
    if (this.editingPromotion) {
      this.srv.updatePromotion(this.editingPromotion._id, this.form).subscribe(() => { this.closeModal(); this.load(); });
    } else {
      this.srv.createPromotion(this.form).subscribe(() => { this.closeModal(); this.load(); });
    }
  }

  deleteItem(id: string) {
    if(confirm('Delete this promotion?')) this.srv.deletePromotion(id).subscribe(() => this.load());
  }
}
