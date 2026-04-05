import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReturnRequestListComponent } from './return-request-list.component';

describe('ReturnRequestListComponent', () => {
  let component: ReturnRequestListComponent;
  let fixture: ComponentFixture<ReturnRequestListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReturnRequestListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReturnRequestListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
