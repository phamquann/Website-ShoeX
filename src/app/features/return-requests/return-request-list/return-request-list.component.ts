import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReturnRequestService } from '../../../core/services/return-request.service';

@Component({
  selector: 'app-return-request-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './return-request-list.component.html',
  styleUrls: ['../../brands/brand-list/brand-list.component.scss']
})
export class ReturnRequestListComponent implements OnInit {
  requests: any[] = [];
  constructor(private srv: ReturnRequestService) {}
  ngOnInit() { this.load(); }
  load() { this.srv.getAll().subscribe(res => { if(res.success) this.requests = res.data; }); }
  changeStatus(id: string, status: string) {
    if(confirm(`Change status to ${status}?`)) this.srv.updateStatus(id, status).subscribe(() => this.load());
  }
}
