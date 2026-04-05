import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RefundService } from '../../../core/services/refund.service';

@Component({
  selector: 'app-refund-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './refund-list.component.html',
  styleUrls: ['../../brands/brand-list/brand-list.component.scss']
})
export class RefundListComponent implements OnInit {
  refunds: any[] = [];

  constructor(private srv: RefundService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.srv.getAll().subscribe(res => {
      if (res.success) this.refunds = res.data;
    });
  }

  updateStatus(item: any, status: string) {
    let transactionId = item.transactionId || '';
    let adminNote = '';

    if (status === 'completed') {
      const manualTransactionId = prompt('Nhap ma giao dich hoan tien:');
      if (manualTransactionId === null) return;
      transactionId = manualTransactionId;
    } else {
      const note = prompt('Nhap ghi chu cho buoc xu ly nay (khong bat buoc):');
      if (note === null) return;
      adminNote = note;
    }

    if (confirm(`Update status to ${status}?`)) {
      this.srv.updateStatus(item._id, { status, transactionId, adminNote }).subscribe(() => this.load());
    }
  }
}
