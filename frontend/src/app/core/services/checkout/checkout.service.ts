import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private apiUrl = 'http://localhost:3000/api/v1/checkout';

  constructor(private http: HttpClient) {}

  checkout(data: { addressId: string; paymentMethod: string; note?: string; idempotencyKey: string }): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  confirmCod(orderId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/confirm-cod/${orderId}`, {});
  }
}
