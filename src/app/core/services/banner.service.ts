import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BannerService {
  private apiUrl = 'http://localhost:3000/api/v1/banners';

  constructor(private http: HttpClient) {}

  getBanners(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  createBanner(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateBanner(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteBanner(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
