import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMsg: string = '';
  successMsg: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.errorMsg = '';
    this.successMsg = '';
    
    this.authService.register(this.registerForm.value).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.successMsg = 'Đăng ký thành công! Đang chuyển hướng...';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1500);
        } else {
          this.errorMsg = res.message || 'Đăng ký thất bại!';
          this.isLoading = false;
        }
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.';
        this.isLoading = false;
      }
    });
  }
}
