import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart/cart.service';
import { BrandService } from '../../../core/services/brand.service';
import { CategoryService } from '../../../core/services/category.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-product-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './product-catalog.component.html',
  styleUrls: ['./product-catalog.component.scss']
})
export class ProductCatalogComponent implements OnInit {
  products: any[] = [];
  brands: any[] = [];
  categories: any[] = [];
  isLoading = true;

  // Filters
  filter = {
    search: '',
    brand: '',
    category: '',
    sort: '-createdAt'
  };

  // Variant Modal
  showModal = false;
  selectedProduct: any = null;
  selectedVariantId: string = '';
  quantity: number = 1;
  isAdding = false;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private brandService: BrandService,
    private categoryService: CategoryService
  ) {}

  ngOnInit() {
    this.loadBrands();
    this.loadCategories();
    this.loadProducts();
  }

  loadBrands() {
    this.brandService.getBrands().subscribe(res => {
      if (res.success) this.brands = res.data;
    });
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe(res => {
      if (res.success) this.categories = res.data;
    });
  }

  loadProducts() {
    this.isLoading = true;
    const params: any = {
      limit: 50,
      sort: this.filter.sort
    };

    if (this.filter.search) params.search = this.filter.search;
    if (this.filter.brand) params.brand = this.filter.brand;
    if (this.filter.category) params.category = this.filter.category;

    this.productService.getProducts(params).subscribe({
      next: (res) => {
        if (res.success) {
          this.products = res.data;
        }
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  applyFilters() {
    this.loadProducts();
  }

  clearFilters() {
    this.filter = {
      search: '',
      brand: '',
      category: '',
      sort: '-createdAt'
    };
    this.loadProducts();
  }

  openProductModal(product: any) {
    this.selectedProduct = product;
    this.selectedVariantId = product.variants && product.variants.length > 0 ? product.variants[0]._id : '';
    this.quantity = 1;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedProduct = null;
  }

  addToCart() {
    if (!this.selectedVariantId) {
      alert('Vui lòng chọn Size/Màu sắc để thêm vào giỏ');
      return;
    }

    this.isAdding = true;
    this.cartService.addItem(this.selectedVariantId, this.quantity).subscribe({
      next: (res) => {
        if (res.success) {
          this.cartService.getMyCart().subscribe();
          alert('Đã thêm vào giỏ hàng!');
          this.closeModal();
        }
        this.isAdding = false;
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra');
        this.isAdding = false;
      }
    });
  }

  getAvailableStock(variantId: string): number {
    if (!this.selectedProduct) return 0;
    const v = this.selectedProduct.variants.find((x:any) => x._id === variantId);
    return v ? (v.stock - v.reserved) : 0;
  }
}
