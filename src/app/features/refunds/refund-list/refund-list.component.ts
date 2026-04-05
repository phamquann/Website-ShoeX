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
  ngOnInit() { this.load(); }
  load() { this.srv.getAll().subscribe(res => { if(res.success) this.refunds = res.data; }); }
  updateStatus(id: string, status: string, transactionId: string = '') {
    if(confirm(`Update status to ${status}?`)) this.srv.updateStatus(id, { status, transactionId }).subscribe(() => this.load());
  }
}
