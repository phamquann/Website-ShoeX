import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RefundService {
  private apiUrl = 'http://localhost:3000/api/v1/refunds';
  constructor(private http: HttpClient) {}
  createRefund(data: any): Observable<any> { return this.http.post<any>(this.apiUrl, data); }
  updateStatus(id: string, data: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/${id}`, data); }
  getAll(): Observable<any> { return this.http.get<any>(this.apiUrl); }
  getByOrder(orderId: string): Observable<any> { return this.http.get<any>(`${this.apiUrl}/order/${orderId}`); }
}
