import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-email-compose-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './email-compose-modal.component.html',
  styleUrls: ['./email-compose-modal.component.css']
})
export class EmailComposeModalComponent {
  @Input() to: string = '';
  @Input() subject: string = '';
  @Input() body: string = '';

  @Output() close = new EventEmitter<void>();
  @Output() send = new EventEmitter<{ to: string, subject: string, body: string }>();

  templates = [
    { name: 'Intro', subject: 'Introduction to Finkey CRM', body: 'Hi,\n\nI would like to introduce you to...' },
    { name: 'Follow-up', subject: 'Following up on our conversation', body: 'Hi,\n\nJust checking in on...' },
    { name: 'Proposal', subject: 'Proposal for your review', body: 'Hi,\n\nPlease find the attached proposal...' }
  ];

  selectTemplate(template: any) {
    this.subject = template.subject;
    this.body = template.body;
  }

  onSend() {
    this.send.emit({ to: this.to, subject: this.subject, body: this.body });
  }

  onClose() {
    this.close.emit();
  }
}
