import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart/cart.service';
import { ReviewService } from '../../../core/services/review.service';

type HasImagesFilter = '' | 'true' | 'false';

interface RatingBreakdown {
  star1: number;
  star2: number;
  star3: number;
  star4: number;
  star5: number;
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  productId = '';
  product: any = null;

  productImages: string[] = [];
  selectedImage = '';
  selectedVariantId = '';
  quantity = 1;

  isLoading = true;
  isReviewLoading = true;
  isAdding = false;

  reviews: any[] = [];
  reviewFilter: { star: number | ''; hasImages: HasImagesFilter; page: number; limit: number } = {
    star: '',
    hasImages: '',
    page: 1,
    limit: 6
  };
  reviewMeta = {
    page: 1,
    totalPages: 1,
    total: 0
  };
  reviewSummary: { averageRating: number; totalReviews: number; ratingBreakdown: RatingBreakdown } = {
    averageRating: 0,
    totalReviews: 0,
    ratingBreakdown: this.emptyBreakdown()
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private reviewService: ReviewService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.router.navigate(['/products-catalog']);
        return;
      }

      this.productId = id;
      this.loadProduct();
      this.loadReviews(true);
    });
  }

  loadProduct(): void {
    this.isLoading = true;
    this.productService.getProductById(this.productId).subscribe({
      next: (res) => {
        if (res.success) {
          this.product = res.data;
          this.prepareProductImages();
          this.setDefaultVariant();
          this.syncSummaryFromProduct();
        } else {
          this.product = null;
        }
        this.isLoading = false;
      },
      error: () => {
        this.product = null;
        this.isLoading = false;
      }
    });
  }

  loadReviews(resetPage = false): void {
    if (resetPage) {
      this.reviewFilter.page = 1;
    }

    this.isReviewLoading = true;

    const query: { star?: number; hasImages?: string; page: number; limit: number } = {
      page: this.reviewFilter.page,
      limit: this.reviewFilter.limit
    };

    if (this.reviewFilter.star !== '') {
      query.star = this.reviewFilter.star;
    }

    if (this.reviewFilter.hasImages) {
      query.hasImages = this.reviewFilter.hasImages;
    }

    this.reviewService.getProductReviews(this.productId, query).subscribe({
      next: (res) => {
        if (res.success) {
          this.reviews = res.data || [];

          const meta = res.meta || {};
          this.reviewMeta = {
            page: Number(meta.page || this.reviewFilter.page || 1),
            totalPages: Math.max(Number(meta.totalPages || 1), 1),
            total: Number(meta.total || 0)
          };

          this.updateSummary(meta.summary || null);
        } else {
          this.reviews = [];
          this.reviewMeta = { page: 1, totalPages: 1, total: 0 };
          this.syncSummaryFromProduct();
        }
        this.isReviewLoading = false;
      },
      error: () => {
        this.reviews = [];
        this.reviewMeta = { page: 1, totalPages: 1, total: 0 };
        this.syncSummaryFromProduct();
        this.isReviewLoading = false;
      }
    });
  }

  applyReviewFilters(): void {
    this.loadReviews(true);
  }

  changeReviewPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.reviewMeta.totalPages || nextPage === this.reviewFilter.page) {
      return;
    }

    this.reviewFilter.page = nextPage;
    this.loadReviews(false);
  }

  goBackToCatalog(): void {
    this.router.navigate(['/products-catalog']);
  }

  selectImage(url: string): void {
    this.selectedImage = url;
  }

  selectVariant(variantId: string): void {
    this.selectedVariantId = variantId;
    this.onVariantChanged();
  }

  onVariantChanged(): void {
    const available = this.getSelectedVariantAvailableStock();
    if (available <= 0) {
      this.quantity = 1;
      return;
    }

    if (this.quantity > available) {
      this.quantity = available;
    }

    if (this.quantity < 1) {
      this.quantity = 1;
    }
  }

  addToCart(): void {
    if (!this.selectedVariantId) {
      alert('Vui long chon size/mau truoc khi them vao gio.');
      return;
    }

    const available = this.getSelectedVariantAvailableStock();
    if (available <= 0 || this.quantity < 1 || this.quantity > available) {
      alert('So luong khong hop le hoac san pham da het hang.');
      return;
    }

    this.isAdding = true;
    this.cartService.addItem(this.selectedVariantId, this.quantity).subscribe({
      next: (res) => {
        if (res.success) {
          this.cartService.getMyCart().subscribe();
          alert('Da them vao gio hang!');
        }
        this.isAdding = false;
      },
      error: (err) => {
        alert(err.error?.message || 'Khong the them vao gio hang.');
        this.isAdding = false;
      }
    });
  }

  getSelectedVariant(): any | null {
    if (!this.product?.variants?.length || !this.selectedVariantId) {
      return null;
    }

    return this.product.variants.find((variant: any) => variant._id === this.selectedVariantId) || null;
  }

  getSelectedVariantAvailableStock(): number {
    const variant = this.getSelectedVariant();
    return this.getVariantAvailableStock(variant);
  }

  getVariantAvailableStock(variant: any): number {
    if (!variant) {
      return 0;
    }

    const stock = Number(variant.stock || 0);
    const reserved = Number(variant.reserved || 0);
    return Math.max(stock - reserved, 0);
  }

  isVariantDisabled(variant: any): boolean {
    return this.getVariantAvailableStock(variant) <= 0;
  }

  getVariantPrice(variant: any): number {
    if (!variant) {
      return Number(this.product?.salePrice || 0);
    }

    const variantPrice = Number(variant.price || 0);
    return variantPrice > 0 ? variantPrice : Number(this.product?.salePrice || 0);
  }

  getCurrentPrice(): number {
    const variant = this.getSelectedVariant();
    return this.getVariantPrice(variant);
  }

  getDisplayName(review: any): string {
    return review?.user?.fullName || review?.user?.username || 'Khach hang';
  }

  getUserInitial(review: any): string {
    const display = this.getDisplayName(review);
    return display.length > 0 ? display.charAt(0).toUpperCase() : 'U';
  }

  getReviewDate(review: any): string {
    return review?.created_at || review?.createdAt || '';
  }

  getStars(star: number): number[] {
    const safeStar = Math.max(0, Math.min(5, Math.floor(Number(star || 0))));
    return Array.from({ length: safeStar }, (_, index) => index);
  }

  getBreakdownCount(star: number): number {
    switch (star) {
      case 1: return this.reviewSummary.ratingBreakdown.star1;
      case 2: return this.reviewSummary.ratingBreakdown.star2;
      case 3: return this.reviewSummary.ratingBreakdown.star3;
      case 4: return this.reviewSummary.ratingBreakdown.star4;
      case 5: return this.reviewSummary.ratingBreakdown.star5;
      default: return 0;
    }
  }

  getBreakdownPercent(star: number): number {
    if (this.reviewSummary.totalReviews <= 0) {
      return 0;
    }

    const count = this.getBreakdownCount(star);
    return Math.round((count / this.reviewSummary.totalReviews) * 100);
  }

  private prepareProductImages(): void {
    const images = new Set<string>();

    if (this.product?.thumbnail) {
      images.add(this.product.thumbnail);
    }

    if (Array.isArray(this.product?.images)) {
      this.product.images.forEach((img: any) => {
        const url = typeof img === 'string' ? img : img?.url;
        if (url) {
          images.add(url);
        }
      });
    }

    this.productImages = Array.from(images);
    this.selectedImage = this.productImages[0] || '';
  }

  private setDefaultVariant(): void {
    if (!Array.isArray(this.product?.variants) || this.product.variants.length === 0) {
      this.selectedVariantId = '';
      this.quantity = 1;
      return;
    }

    const firstAvailable = this.product.variants.find((variant: any) => this.getVariantAvailableStock(variant) > 0);
    const fallback = this.product.variants[0];
    this.selectedVariantId = firstAvailable?._id || fallback?._id || '';
    this.quantity = 1;
  }

  private updateSummary(summary: any): void {
    if (!summary) {
      this.syncSummaryFromProduct();
      return;
    }

    const breakdown = summary.ratingBreakdown || {};

    this.reviewSummary = {
      averageRating: Number(summary.averageRating || this.product?.averageRating || 0),
      totalReviews: Number(summary.totalReviews || this.product?.reviewCount || this.reviewMeta.total || 0),
      ratingBreakdown: {
        star1: Number(breakdown.star1 || 0),
        star2: Number(breakdown.star2 || 0),
        star3: Number(breakdown.star3 || 0),
        star4: Number(breakdown.star4 || 0),
        star5: Number(breakdown.star5 || 0)
      }
    };
  }

  private syncSummaryFromProduct(): void {
    this.reviewSummary = {
      averageRating: Number(this.product?.averageRating || 0),
      totalReviews: Number(this.product?.reviewCount || 0),
      ratingBreakdown: this.emptyBreakdown()
    };
  }

  private emptyBreakdown(): RatingBreakdown {
    return {
      star1: 0,
      star2: 0,
      star3: 0,
      star4: 0,
      star5: 0
    };
  }
}
