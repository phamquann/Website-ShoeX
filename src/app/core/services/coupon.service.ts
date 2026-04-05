import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CouponService {
  private apiUrl = 'http://localhost:3000/api/v1/coupons';

  constructor(private http: HttpClient) {}

  getCoupons(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  createCoupon(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateCoupon(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteCoupon(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  checkCoupon(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/check`, data);
  }
}
