import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:3000/api/v1/notifications';

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  markAsRead(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/read`, {});
  }

  sendSystemNotification(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/system`, data);
  }
}
