import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../../core/services/brand.service';

import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-brand-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-list.component.html',
  styleUrls: ['./brand-list.component.scss']
})
export class BrandListComponent implements OnInit {
  brands: any[] = [];
  meta: any = {};
  searchQuery: string = '';
  currentPage: number = 1;
  limit: number = 10;
  
  showModal = false;
  editingBrand: any = null;
  brandForm: any = { name: '', description: '', logo: '' };

  constructor(
    private brandService: BrandService,
    
  ) {}

  ngOnInit() {
    this.loadBrands();
  }

  loadBrands() {
    this.brandService.getBrands({ name: this.searchQuery, page: this.currentPage, limit: this.limit })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.brands = res.data;
            this.meta = res.meta || {};
          }
        },
        error: (err) => {
          alert('Failed to load brands');
        }
      });
  }

  onSearch() {
    this.currentPage = 1;
    this.loadBrands();
  }

  changePage(page: number) {
    if(page < 1 || page > this.meta.totalPages) return;
    this.currentPage = page;
    this.loadBrands();
  }

  openAddModal() {
    this.editingBrand = null;
    this.brandForm = { name: '', description: '', logo: '' };
    this.showModal = true;
  }

  openEditModal(brand: any) {
    this.editingBrand = brand;
    this.brandForm = { 
      name: brand.name, 
      description: brand.description, 
      logo: brand.logo 
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingBrand = null;
  }

  saveBrand() {
    if (!this.brandForm.name) {
      alert('Brand name is required');
      return;
    }

    if (this.editingBrand) {
      this.brandService.updateBrand(this.editingBrand._id, this.brandForm)
        .subscribe({
          next: (res) => {
            alert('Brand updated successfully');
            this.closeModal();
            this.loadBrands();
          },
          error: (err) => {
            alert(err.error?.message || 'Update failed');
          }
        });
    } else {
      this.brandService.createBrand(this.brandForm)
        .subscribe({
          next: (res) => {
            alert('Brand created successfully');
            this.closeModal();
            this.loadBrands();
          },
          error: (err) => {
            alert(err.error?.message || 'Create failed');
          }
        });
    }
  }

  deleteBrand(id: string) {
    if (confirm('Are you sure you want to delete this brand?')) {
      this.brandService.deleteBrand(id).subscribe({
        next: (res) => {
          alert('Brand deleted successfully');
          this.loadBrands();
        },
        error: (err) => {
          alert('Delete failed');
        }
      });
    }
  }
}
