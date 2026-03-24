import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LeadService } from '../../../core/services/lead.service';
import { Team, LeadStage, LeadStatus } from '../../../core/models/lead.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-create-lead',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-lead.component.html',
  styles: [`
    :host { display: block; font-family: 'Inter', system-ui, sans-serif; background: #f0f4f8; min-height: 100vh; }

    .cl-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem 2.5rem; color: white;
      box-shadow: 0 4px 20px rgba(102,126,234,0.3);
    }
    .cl-header-content { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; }
    .cl-header-left { display: flex; align-items: center; gap: 1rem; }
    .cl-header-icon {
      width: 52px; height: 52px; background: rgba(255,255,255,0.2); border-radius: 14px;
      display: flex; align-items: center; justify-content: center; font-size: 1.5rem;
    }
    .cl-header-title { margin: 0; font-size: 1.75rem; font-weight: 800; letter-spacing: -0.5px; }
    .cl-header-subtitle { margin: 0; font-size: 0.9rem; opacity: 0.85; }
    .cl-back-btn {
      background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);
      padding: 0.5rem 1.25rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.2s;
    }
    .cl-back-btn:hover { background: rgba(255,255,255,0.3); }

    .cl-body { max-width: 1200px; margin: 0 auto; padding: 2rem 2.5rem 8rem; }
    .cl-form { display: flex; flex-direction: column; gap: 1.5rem; }

    .cl-section-status { background: linear-gradient(135deg, #fff9f0 0%, #fff3e0 100%) !important; border-color: #ffcc80 !important; }
    .status-pill-group { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.5rem; }
    .status-pill {
      display: flex; align-items: center; gap: 0.6rem; padding: 0.7rem 1.5rem;
      border-radius: 50px; border: 2px solid; cursor: pointer; font-size: 0.925rem;
      font-weight: 600; transition: all 0.2s; user-select: none;
    }
    .status-pill input[type="radio"] { display: none; }
    .pill-green { border-color: #d1fae5; background: #f0fdf4; color: #065f46; }
    .pill-green.selected { background: #10b981; color: white; border-color: #10b981; box-shadow: 0 4px 14px rgba(16,185,129,0.3); transform: translateY(-2px); }
    .pill-amber { border-color: #fde68a; background: #fffbeb; color: #92400e; }
    .pill-amber.selected { background: #f59e0b; color: white; border-color: #f59e0b; box-shadow: 0 4px 14px rgba(245,158,11,0.3); transform: translateY(-2px); }
    .pill-red { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
    .pill-red.selected { background: #ef4444; color: white; border-color: #ef4444; box-shadow: 0 4px 14px rgba(239,68,68,0.3); transform: translateY(-2px); }

    .cl-section {
      background: white; border-radius: 16px; padding: 1.75rem;
      border: 1px solid #e8ecf0; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .cl-section-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
    .cl-section-icon {
      width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center;
      justify-content: center; font-size: 1.25rem; flex-shrink: 0;
    }
    .status-icon { background: linear-gradient(135deg, #fff3e0, #ffe0b2); }
    .info-icon { background: linear-gradient(135deg, #e3f2fd, #bbdefb); }
    .contact-icon { background: linear-gradient(135deg, #f3e5f5, #e1bee7); }
    .assign-icon { background: linear-gradient(135deg, #e8f5e9, #c8e6c9); }
    .notes-icon { background: linear-gradient(135deg, #fce4ec, #f8bbd0); }
    .cl-section-title { margin: 0; font-size: 1.05rem; font-weight: 700; color: #1a202c; }
    .cl-section-desc { margin: 0.25rem 0 0; font-size: 0.82rem; color: #94a3b8; }

    .cl-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    .cl-field { display: flex; flex-direction: column; gap: 0.4rem; }
    .full { grid-column: 1 / -1; }
    .cl-label { font-size: 0.82rem; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.03em; }
    .required { color: #ef4444; }
    .cl-input {
      width: 100%; padding: 0.7rem 1rem; font-size: 0.95rem; font-family: inherit;
      border: 1.5px solid #e2e8f0; border-radius: 10px; background: #f8fafc; color: #1a202c;
      transition: all 0.2s; box-sizing: border-box; outline: none;
    }
    .cl-input:focus { border-color: #667eea; background: white; box-shadow: 0 0 0 3px rgba(102,126,234,0.12); }
    .cl-input-error { border-color: #ef4444 !important; background: #fff8f8 !important; }
    .cl-textarea { resize: vertical; min-height: 88px; }
    .cl-hint { font-size: 0.78rem; color: #94a3b8; }
    .cl-error { font-size: 0.78rem; color: #ef4444; font-weight: 500; }

    .phone-row { display: flex; flex-direction: column; gap: 0.5rem; }
    .phone-type-toggle { display: flex; gap: 0.5rem; }
    .phone-type-btn {
      flex: 1; text-align: center; padding: 0.4rem 0.75rem; border-radius: 8px;
      border: 1.5px solid #e2e8f0; background: #f8fafc; color: #64748b;
      cursor: pointer; font-size: 0.82rem; font-weight: 600; transition: all 0.2s;
    }
    .phone-type-btn input[type="radio"] { display: none; }
    .phone-type-btn.active { border-color: #667eea; background: #eef2ff; color: #5b21b6; }
    .phone-input-row { display: flex; }
    .phone-prefix {
      padding: 0.7rem 1rem; background: #e8ecf0; border: 1.5px solid #e2e8f0;
      border-right: none; border-radius: 10px 0 0 10px; font-size: 0.9rem; font-weight: 500; color: #555; white-space: nowrap;
    }
    .phone-num { border-radius: 0 10px 10px 0 !important; }

    .cl-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .cl-col { display: flex; flex-direction: column; gap: 1.5rem; }

    .cl-action-bar {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
      background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
      border-top: 1px solid #e2e8f0; box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
    }
    .cl-action-inner {
      max-width: 1200px; margin: 0 auto; padding: 1rem 2.5rem;
      display: flex; align-items: center; justify-content: space-between;
    }
    .cl-action-info { font-size: 0.875rem; }
    .cl-action-warn { color: #d97706; font-weight: 500; }
    .cl-action-ready { color: #059669; font-weight: 500; }
    .cl-action-btns { display: flex; gap: 0.75rem; }
    .cl-btn-cancel {
      padding: 0.6rem 1.5rem; border-radius: 10px; border: 1.5px solid #e2e8f0;
      background: white; color: #374151; font-weight: 500; cursor: pointer; transition: all 0.2s; font-size: 0.9rem;
    }
    .cl-btn-cancel:hover { background: #f8fafc; }
    .cl-btn-submit {
      padding: 0.6rem 2rem; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 0.9rem;
      font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(102,126,234,0.35);
    }
    .cl-btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(102,126,234,0.4); }
    .cl-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

    /* Custom Dropdown Styles */
    .cl-field.relative { position: relative; }
    .cl-suggestions-container {
      position: absolute; top: calc(100% + 5px); left: 0; right: 0;
      background: white; border-radius: 12px; border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      z-index: 1000; max-height: 240px; overflow-y: auto;
      padding: 0.5rem; animation: cl-slide-down 0.2s ease-out;
    }
    .cl-suggestion-item {
      padding: 0.75rem 1rem; border-radius: 8px; cursor: pointer;
      font-size: 0.9rem; color: #1e293b; transition: all 0.15s;
    }
    .cl-suggestion-item:hover { background: #f5f3ff; color: #4f46e5; }
    .cl-empty-suggestion { padding: 0.75rem 1rem; color: #94a3b8; font-size: 0.85rem; font-style: italic; }

    @keyframes cl-slide-down {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .cl-two-col { grid-template-columns: 1fr; }
      .cl-fields { grid-template-columns: 1fr; }
      .cl-header { padding: 1.5rem; }
      .cl-body { padding: 1rem 1rem 6rem; }
      .cl-header-content { flex-direction: column; gap: 1rem; align-items: flex-start; }
    }
  `]
})
export class CreateLeadComponent implements OnInit {
  lead: any = {
    name: '',
    email: '',
    phone: '',
    address: '',
    emirate: '',
    company_name: '',
    industry: '',
    tech_requirements: '',
    stage: LeadStage.NEW_INQUIRY,
    status: LeadStatus.INTERESTED,
    remarks: '',
    assigned_team: Team.SALES,
    lead_generator: null,
    reminder_date: '',
    created_location_lat: null,
    created_location_lng: null,
    created_location_link: null
  };

  locationStatus: 'pending' | 'captured' | 'denied' | 'unavailable' = 'pending';

  phoneType: 'mobile' | 'landline' = 'mobile';
  phonePrefix = '+971 ';
  phoneLocal = '';

  LeadStatus = LeadStatus;

  emirateOptions = [
    'Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'
  ];

  industryOptions = [
    'Automobiles',
    'Aviation & Aerospace',
    'Banking & Finance',
    'Construction & Real Estate',
    'Education & E-learning',
    'Energy & Renewables',
    'Events & Hospitality',
    'Healthcare & Medical',
    'Information Technology',
    'Logistics & Supply Chain',
    'Manufacturing',
    'Media & Marketing',
    'Retail & E-commerce',
    'Tourism & Travel'
  ];

  loading = false;
  users: any[] = [];
  showIndustrySuggestions = false;
  filteredIndustries: string[] = [];

  constructor(
    private leadService: LeadService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.filteredIndustries = [...this.industryOptions];
  }

  filterIndustries() {
    const val = this.lead.industry ? this.lead.industry.toLowerCase() : '';
    this.filteredIndustries = this.industryOptions.filter(opt =>
      opt.toLowerCase().includes(val)
    );
  }

  selectIndustry(opt: string) {
    this.lead.industry = opt;
    this.showIndustrySuggestions = false;
  }

  onIndustryBlur() {
    // Delay hiding to allow click event on suggestion to fire
    setTimeout(() => {
      this.showIndustrySuggestions = false;
    }, 200);
  }

  ngOnInit() {
    this.leadService.getUsers().subscribe(users => {
      this.users = users;
    });
    this.captureLocation();
  }

  captureLocation() {
    if (!navigator.geolocation) {
      this.locationStatus = 'unavailable';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(8));
        const lng = parseFloat(position.coords.longitude.toFixed(8));
        this.lead.created_location_lat = lat;
        this.lead.created_location_lng = lng;
        this.lead.created_location_link = `https://maps.google.com/?q=${lat},${lng}`;
        this.locationStatus = 'captured';
      },
      (_err) => {
        this.locationStatus = 'denied';
      },
      { timeout: 10000, maximumAge: 0 }
    );
  }

  onPhoneTypeChange(type: 'mobile' | 'landline') {
    this.phoneType = type;
    this.phonePrefix = '+971 ';
  }

  setStatus(status: LeadStatus) {
    this.lead.status = status;
  }

  onSubmit() {
    const finalPhone = this.phoneLocal ? (this.phonePrefix + this.phoneLocal.trim()) : '';
    const submissionData = { ...this.lead, phone: finalPhone };

    if (!submissionData.reminder_date) {
      delete submissionData.reminder_date;
    }

    this.loading = true;
    this.leadService.createLead(submissionData).subscribe({
      next: (newLead) => {
        this.toastService.success('Lead Created! ID: ' + newLead.id);
        this.router.navigate(['/dashboard/leads']);
      },
      error: (err) => {
        console.error(err);
        let errorMessage = 'Error creating lead.';
        if (err.error) {
          if (typeof err.error === 'object' && !Array.isArray(err.error)) {
            const errors: string[] = [];
            for (const [field, messages] of Object.entries(err.error)) {
              if (Array.isArray(messages)) {
                errors.push(`${field}: ${messages.join(', ')}`);
              } else {
                errors.push(`${field}: ${messages}`);
              }
            }
            if (errors.length > 0) {
              errorMessage = errors.join('; ');
            }
          } else if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.error.detail) {
            errorMessage = err.error.detail;
          }
        }
        this.toastService.error(errorMessage);
        this.loading = false;
      }
    });
  }

  cancel() {
    this.router.navigate(['/dashboard/leads']);
  }
}
