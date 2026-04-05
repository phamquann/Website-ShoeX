import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../../core/services/category.service';


@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category-list.component.html',
  styleUrls: ['../../brands/brand-list/brand-list.component.scss'] // Reusing styles from brand-list
})
export class CategoryListComponent implements OnInit {
  categories: any[] = [];
  meta: any = {};
  searchQuery: string = '';
  currentPage: number = 1;
  limit: number = 10;
  
  showModal = false;
  editingCategory: any = null;
  categoryForm: any = { name: '', description: '' };

  constructor(
    private categoryService: CategoryService,
    
  ) {}

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.categoryService.getCategories({ name: this.searchQuery, page: this.currentPage, limit: this.limit })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.categories = res.data;
            this.meta = res.meta || {};
          }
        },
        error: (err) => {
          alert('Failed to load categories');
        }
      });
  }

  onSearch() {
    this.currentPage = 1;
    this.loadCategories();
  }

  changePage(page: number) {
    if(page < 1 || page > this.meta.totalPages) return;
    this.currentPage = page;
    this.loadCategories();
  }

  openAddModal() {
    this.editingCategory = null;
    this.categoryForm = { name: '', description: '' };
    this.showModal = true;
  }

  openEditModal(category: any) {
    this.editingCategory = category;
    this.categoryForm = { 
      name: category.name, 
      description: category.description
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingCategory = null;
  }

  saveCategory() {
    if (!this.categoryForm.name) {
      alert('Category name is required');
      return;
    }

    if (this.editingCategory) {
      this.categoryService.updateCategory(this.editingCategory._id, this.categoryForm)
        .subscribe({
          next: (res) => {
            alert('Category updated successfully');
            this.closeModal();
            this.loadCategories();
          },
          error: (err) => {
            alert(err.error?.message || 'Update failed');
          }
        });
    } else {
      this.categoryService.createCategory(this.categoryForm)
        .subscribe({
          next: (res) => {
            alert('Category created successfully');
            this.closeModal();
            this.loadCategories();
          },
          error: (err) => {
            alert(err.error?.message || 'Create failed');
          }
        });
    }
  }

  deleteCategory(id: string) {
    if (confirm('Are you sure you want to delete this category?')) {
      this.categoryService.deleteCategory(id).subscribe({
        next: (res) => {
          alert('Category deleted successfully');
          this.loadCategories();
        },
        error: (err) => {
          alert('Delete failed');
        }
      });
    }
  }
}
