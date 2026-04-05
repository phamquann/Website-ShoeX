import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = 'http://localhost:3000/api/v1/reviews';
  constructor(private http: HttpClient) {}
  getMyReviews(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/me`); }
  deleteReview(id: string): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/${id}`); }
  updateReview(id: string, data: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/${id}`, data); }
}
