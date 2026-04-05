import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WishlistService } from '../../../core/services/wishlist.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-wishlist-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './wishlist-list.component.html',
  styleUrls: ['../../brands/brand-list/brand-list.component.scss']
})
export class WishlistListComponent implements OnInit {
  products: any[] = [];

  constructor(private srv: WishlistService) {}
  
  ngOnInit() { this.load(); }
  
  load() { 
    this.srv.getMyWishlist().subscribe(res => { 
      if(res.success && res.data) this.products = res.data.products; 
    }); 
  }
  
  remove(id: string) {
    if (confirm('Bỏ sản phẩm này khỏi yêu thích?')) {
      this.srv.removeFromWishlist(id).subscribe(() => this.load());
    }
  }
}
