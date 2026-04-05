import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BannerService } from '../../../core/services/banner.service';

@Component({
  selector: 'app-banner-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './banner-list.component.html',
  styleUrls: ['../../brands/brand-list/brand-list.component.scss']
})
export class BannerListComponent implements OnInit {
  banners: any[] = [];
  
  showModal = false;
  editingBanner: any = null;
  bannerForm: any = { title: '', imageUrl: '', link: '', sortOrder: 0, isActive: true };

  constructor(private bannerService: BannerService) {}

  ngOnInit() {
    this.loadBanners();
  }

  loadBanners() {
    this.bannerService.getBanners().subscribe({
      next: (res) => {
        if (res.success) {
          this.banners = res.data;
        }
      },
      error: (err) => {
        console.error('Failed to load banners', err);
      }
    });
  }

  openAddModal() {
    this.editingBanner = null;
    this.bannerForm = { title: '', imageUrl: '', link: '', sortOrder: 0, isActive: true };
    this.showModal = true;
  }

  openEditModal(banner: any) {
    this.editingBanner = banner;
    this.bannerForm = { 
      title: banner.title, 
      imageUrl: banner.imageUrl, 
      link: banner.link,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingBanner = null;
  }

  saveBanner() {
    if (!this.bannerForm.title || !this.bannerForm.imageUrl) {
      alert('Title and Image URL are required');
      return;
    }

    if (this.editingBanner) {
      this.bannerService.updateBanner(this.editingBanner._id, this.bannerForm).subscribe({
        next: (res) => {
          alert('Banner updated successfully');
          this.closeModal();
          this.loadBanners();
        },
        error: (err) => {
          alert(err.error?.message || 'Update failed');
        }
      });
    } else {
      this.bannerService.createBanner(this.bannerForm).subscribe({
        next: (res) => {
          alert('Banner created successfully');
          this.closeModal();
          this.loadBanners();
        },
        error: (err) => {
          alert(err.error?.message || 'Create failed');
        }
      });
    }
  }

  deleteBanner(id: string) {
    if (confirm('Are you sure you want to delete this banner?')) {
      this.bannerService.deleteBanner(id).subscribe({
        next: (res) => {
          alert('Banner deleted successfully');
          this.loadBanners();
        },
        error: (err) => {
          alert('Delete failed');
        }
      });
    }
  }
}
