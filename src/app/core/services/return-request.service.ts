import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReturnRequestService {
  private apiUrl = 'http://localhost:3000/api/v1/return-requests';
  constructor(private http: HttpClient) {}
  getAll(): Observable<any> { return this.http.get<any>(this.apiUrl); }
  updateStatus(id: string, status: string): Observable<any> { return this.http.put<any>(`${this.apiUrl}/${id}/status`, { status }); }
}
