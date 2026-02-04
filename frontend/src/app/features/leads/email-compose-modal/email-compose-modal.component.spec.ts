import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailComposeModalComponent } from './email-compose-modal.component';

describe('EmailComposeModalComponent', () => {
  let component: EmailComposeModalComponent;
  let fixture: ComponentFixture<EmailComposeModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailComposeModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EmailComposeModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
