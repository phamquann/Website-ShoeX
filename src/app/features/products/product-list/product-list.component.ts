import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { BrandService } from '../../../core/services/brand.service';
import { CategoryService } from '../../../core/services/category.service';


@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-list.component.html',
  styleUrls: ['../../brands/brand-list/brand-list.component.scss'] // Reusing shared styles
})
export class ProductListComponent implements OnInit {
  products: any[] = [];
  brands: any[] = [];
  categories: any[] = [];

  meta: any = {};
  searchQuery: string = '';
  currentPage: number = 1;
  limit: number = 10;
  
  showModal = false;
  editingProduct: any = null;
  productForm: any = { name: '', sku: '', originalPrice: 0, salePrice: 0, description: '', brand: '', category: '', thumbnail: '', isActive: true };

  // For variant management
  showVariantModal = false;
  selectedProduct: any = null;
  variants: any[] = [];
  editingVariant: any = null;
  variantForm: any = { size: '', colorName: '', colorHexCode: '#000000', sku: '', price: 0, stock: 0 };

  constructor(
    private productService: ProductService,
    private brandService: BrandService,
    private categoryService: CategoryService,
    
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.loadDropdowns();
  }

  loadDropdowns() {
    this.brandService.getBrands({ limit: 1000 }).subscribe(res => {
      if(res.success) this.brands = res.data;
    });
    this.categoryService.getCategories({ limit: 1000 }).subscribe(res => {
      if(res.success) this.categories = res.data;
    });
  }

  loadProducts() {
    this.productService.getProducts({ search: this.searchQuery, page: this.currentPage, limit: this.limit })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.products = res.data;
            this.meta = res.meta || {};
          }
        },
        error: (err) => {
          alert('Failed to load products');
        }
      });
  }

  onSearch() {
    this.currentPage = 1;
    this.loadProducts();
  }

  changePage(page: number) {
    if(page < 1 || page > this.meta.totalPages) return;
    this.currentPage = page;
    this.loadProducts();
  }

  // --- Product CRUD ---

  openAddModal() {
    this.editingProduct = null;
    this.productForm = { name: '', sku: '', originalPrice: 0, salePrice: 0, description: '', brand: '', category: '', thumbnail: '', isActive: true };
    this.showModal = true;
  }

  openEditModal(product: any) {
    this.editingProduct = product;
    this.productForm = { 
      name: product.name, 
      sku: product.sku,
      originalPrice: product.originalPrice,
      salePrice: product.salePrice,
      description: product.description,
      brand: product.brand?._id || product.brand,
      category: product.category?._id || product.category,
      thumbnail: product.thumbnail,
      isActive: product.isActive
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingProduct = null;
  }

  saveProduct() {
    if (!this.productForm.name || !this.productForm.sku || !this.productForm.brand || !this.productForm.category) {
      alert('Name, SKU, Brand and Category are required');
      return;
    }

    if (this.editingProduct) {
      this.productService.updateProduct(this.editingProduct._id, this.productForm)
        .subscribe({
          next: () => {
            alert('Product updated successfully');
            this.closeModal();
            this.loadProducts();
          },
          error: (err) => alert(err.error?.message || 'Update failed')
        });
    } else {
      this.productService.createProduct(this.productForm)
        .subscribe({
          next: () => {
            alert('Product created successfully');
            this.closeModal();
            this.loadProducts();
          },
          error: (err) => alert(err.error?.message || 'Create failed')
        });
    }
  }

  deleteProduct(id: string) {
    if (confirm('Are you sure you want to delete this product?')) {
      this.productService.deleteProduct(id).subscribe({
        next: () => {
          alert('Product deleted successfully');
          this.loadProducts();
        },
        error: () => alert('Delete failed')
      });
    }
  }

  // --- Variants Management ---

  manageVariants(product: any) {
    this.selectedProduct = product;
    this.loadVariants(product._id);
    this.showVariantModal = true;
  }

  loadVariants(productId: string) {
    this.productService.getVariantsByProduct(productId)
      .subscribe(res => {
        if(res.success) this.variants = res.data;
      });
  }

  closeVariantModal() {
    this.showVariantModal = false;
    this.selectedProduct = null;
    this.variants = [];
    this.editingVariant = null;
  }

  editVariant(variant: any) {
    this.editingVariant = variant;
    this.variantForm = {
      size: variant.size,
      colorName: variant.color.name,
      colorHexCode: variant.color.hexCode,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock
    };
  }

  resetVariantForm() {
    this.editingVariant = null;
    this.variantForm = { size: '', colorName: '', colorHexCode: '#000000', sku: '', price: 0, stock: 0 };
  }

  saveVariant() {
    if(!this.variantForm.size || !this.variantForm.colorName || !this.variantForm.sku) {
      alert('Size, Color Name and SKU are required');
      return;
    }

    if(this.editingVariant) {
      this.productService.updateVariant(this.editingVariant._id, this.variantForm)
        .subscribe({
          next: () => {
            alert('Variant updated');
            this.resetVariantForm();
            this.loadVariants(this.selectedProduct._id);
          },
          error: (err) => alert(err.error?.message || 'Update failed')
        });
    } else {
      const payload = { ...this.variantForm, product: this.selectedProduct._id };
      this.productService.createVariant(payload)
        .subscribe({
          next: () => {
            alert('Variant created');
            this.resetVariantForm();
            this.loadVariants(this.selectedProduct._id);
          },
          error: (err) => alert(err.error?.message || 'Create failed')
        });
    }
  }

  deleteVariant(id: string) {
    if(confirm('Are you sure you want to delete this variant?')) {
      this.productService.deleteVariant(id).subscribe({
        next: () => {
          alert('Variant deleted');
          this.loadVariants(this.selectedProduct._id);
        },
        error: () => alert('Delete failed')
      });
    }
  }
}
