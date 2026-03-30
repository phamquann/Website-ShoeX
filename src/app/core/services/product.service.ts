import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:3000/api/v1/products';
  private variantUrl = 'http://localhost:3000/api/v1/product-variants';

  constructor(private http: HttpClient) {}

  // Products
  getProducts(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.brand) params = params.set('brand', filters.brand);
      if (filters.category) params = params.set('category', filters.category);
      if (filters.page) params = params.set('page', filters.page);
      if (filters.limit) params = params.set('limit', filters.limit);
      if (filters.sort) params = params.set('sort', filters.sort);
    }
    return this.http.get<any>(this.apiUrl, { params });
  }

  getProductById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createProduct(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateProduct(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // Variants
  getVariantsByProduct(productId: string): Observable<any> {
    return this.http.get<any>(`${this.variantUrl}?product=${productId}`);
  }

  createVariant(data: any): Observable<any> {
    return this.http.post<any>(this.variantUrl, data);
  }

  updateVariant(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.variantUrl}/${id}`, data);
  }

  deleteVariant(id: string): Observable<any> {
    return this.http.delete<any>(`${this.variantUrl}/${id}`);
  }
}
