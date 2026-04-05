import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../../core/services/review.service';

@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-list.component.html',
  styleUrls: ['../../brands/brand-list/brand-list.component.scss']
})
export class ReviewListComponent implements OnInit {
  reviews: any[] = [];
  editingReview: any = null;
  form: any = { rating: 5, comment: '' };
  showModal = false;

  constructor(private srv: ReviewService) {}
  ngOnInit() { this.load(); }
  load() { this.srv.getMyReviews().subscribe(res => { if(res.success) this.reviews = res.data; }); }
  deleteItem(id: string) { if(confirm('Xóa đánh giá này?')) this.srv.deleteReview(id).subscribe(() => this.load()); }
  openEdit(item: any) { 
    this.editingReview = item; 
    this.form = { rating: item.rating, comment: item.comment }; 
    this.showModal = true; 
  }
  closeModal() { this.showModal = false; }
  save() {
    this.srv.updateReview(this.editingReview._id, this.form).subscribe(() => { this.closeModal(); this.load(); });
  }
}
