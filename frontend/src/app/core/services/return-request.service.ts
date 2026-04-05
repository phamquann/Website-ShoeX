import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReturnRequestService {
  private apiUrl = 'http://localhost:3000/api/v1/return-requests';
  constructor(private http: HttpClient) {}
  create(data: any): Observable<any> { return this.http.post<any>(this.apiUrl, data); }
  getAll(): Observable<any> { return this.http.get<any>(this.apiUrl); }
  getByOrder(orderId: string): Observable<any> { return this.http.get<any>(`${this.apiUrl}/order/${orderId}`); }
  updateStatus(id: string, data: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/${id}/status`, data); }
}
