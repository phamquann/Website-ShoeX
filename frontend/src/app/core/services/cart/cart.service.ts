import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = 'http://localhost:3000/api/v1/carts';
  private cartCountSubject = new BehaviorSubject<number>(0);
  public cartCount$ = this.cartCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  getMyCart(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me`).pipe(
      tap(res => {
        if (res.success) {
          this.cartCountSubject.next(res.data.totalItems || 0);
        }
      })
    );
  }

  addItem(variantId: string, quantity: number = 1): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/items`, { variantId, quantity });
  }

  updateItem(itemId: string, quantity: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/items/${itemId}`, { quantity });
  }

  removeItem(itemId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/items/${itemId}`);
  }

  clearCart(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/clear`);
  }

  updateCartCount(count: number) {
    this.cartCountSubject.next(count);
  }
}
