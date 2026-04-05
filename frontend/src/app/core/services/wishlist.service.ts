import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private apiUrl = 'http://localhost:3000/api/v1/wishlists';
  constructor(private http: HttpClient) {}
  getMyWishlist(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/me`); }
  addToWishlist(productId: string): Observable<any> { return this.http.post<any>(this.apiUrl, { productId }); }
  removeFromWishlist(productId: string): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/${productId}`); }
}
