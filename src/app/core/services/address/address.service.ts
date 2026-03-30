import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  private apiUrl = 'http://localhost:3000/api/v1/user-addresses';

  constructor(private http: HttpClient) {}

  getAddresses(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  createAddress(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateAddress(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteAddress(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
