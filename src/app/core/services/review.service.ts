import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = 'http://localhost:3000/api/v1/reviews';
  private productApiUrl = 'http://localhost:3000/api/v1/products';

  constructor(private http: HttpClient) {}

  getMyReviews(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/me`); }
  deleteReview(id: string): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/${id}`); }
  updateReview(id: string, data: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/${id}`, data); }
  createReview(data: FormData): Observable<any> { return this.http.post<any>(this.apiUrl, data); }

  getReviewableItems(query?: { reviewed?: 'true' | 'false'; page?: number; limit?: number }): Observable<any> {
    let params = new HttpParams();
    if (query) {
      if (query.reviewed) params = params.set('reviewed', query.reviewed);
      if (query.page) params = params.set('page', `${query.page}`);
      if (query.limit) params = params.set('limit', `${query.limit}`);
    }
    return this.http.get<any>(`${this.apiUrl}/reviewable`, { params });
  }

  getProductReviews(productId: string, query?: { star?: number | string; hasImages?: string; page?: number; limit?: number }): Observable<any> {
    let params = new HttpParams();
    if (query) {
      if (query.star !== undefined && query.star !== null && `${query.star}` !== '') params = params.set('star', `${query.star}`);
      if (query.hasImages) params = params.set('hasImages', query.hasImages);
      if (query.page) params = params.set('page', `${query.page}`);
      if (query.limit) params = params.set('limit', `${query.limit}`);
    }
    return this.http.get<any>(`${this.productApiUrl}/${productId}/reviews`, { params });
  }

  getProductReviewSummary(productId: string): Observable<any> {
    return this.http.get<any>(`${this.productApiUrl}/${productId}/reviews/summary`);
  }
}
