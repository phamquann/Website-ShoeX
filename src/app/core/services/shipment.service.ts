import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ShipmentService {
  private apiUrl = 'http://localhost:3000/api/v1/shipments';
  constructor(private http: HttpClient) {}
  getAll(): Observable<any> { return this.http.get<any>(this.apiUrl); }
  getByOrder(orderId: string): Observable<any> { return this.http.get<any>(`${this.apiUrl}/order/${orderId}`); }
  update(orderId: string, data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/order/${orderId}`, data); }
}
