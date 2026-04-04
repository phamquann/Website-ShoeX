import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = 'http://localhost:3000/api/v1/orders';

  constructor(private http: HttpClient) {}

  getMyOrders(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.page) httpParams = httpParams.set('page', params.page);
      if (params.limit) httpParams = httpParams.set('limit', params.limit);
    }
    return this.http.get<any>(`${this.apiUrl}/me`, { params: httpParams });
  }

  getOrderById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getAllOrders(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.page) httpParams = httpParams.set('page', params.page);
      if (params.limit) httpParams = httpParams.set('limit', params.limit);
    }
    return this.http.get<any>(this.apiUrl, { params: httpParams });
  }

  updateOrderStatus(id: string, status: string, cancelReason?: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, { status, cancelReason });
  }
}
