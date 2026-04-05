import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ShipmentService {
  // Let's assume we can fetch all shipments for admin
  private apiUrl = 'http://localhost:3000/api/v1/shipments';
  constructor(private http: HttpClient) {}
  getAll(): Observable<any> { return this.http.get<any>(this.apiUrl); }
  update(orderId: string, data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/order/${orderId}`, data); }
}
