export enum LeadStatus {
    INTERESTED = 'INTERESTED',
    NOT_INTERESTED = 'NOT_INTERESTED',
    NEEDS_FOLLOW_UP = 'NEEDS_FOLLOW_UP'
}

export enum LeadStage {
    NEW_INQUIRY = 'NEW_INQUIRY',
    QUALIFICATION = 'QUALIFICATION',
    DISCOVERY = 'DISCOVERY',
    PROPOSAL = 'PROPOSAL',
    NEGOTIATION = 'NEGOTIATION',
    WON = 'WON',
    PROJECT_EXECUTION = 'PROJECT_EXECUTION',
    DELIVERED = 'DELIVERED',
    LOST = 'LOST',
    ON_HOLD = 'ON_HOLD'
}

export enum Team {
    SALES = 'SALES',
    ADMIN = 'ADMIN',
    TECH = 'TECH'
}

export enum TechPipelineStage {
    PLANNING = 'PLANNING',
    DESIGNING = 'DESIGNING',
    EXECUTING = 'EXECUTING',
    REVIEW = 'REVIEW',
    TESTING = 'TESTING'
}

export interface User {
    id: number;
    username: string;
    email: string;
    team: Team;
    is_manager: boolean;
    view_tech_pipeline?: boolean;
    manage_tech_pipeline?: boolean;
    can_create_leads?: boolean;
    can_delete_leads?: boolean;
    can_export_leads?: boolean;
}

export interface TechPipeline {
    id: number;
    lead: number;
    lead_name?: string;
    stage: 'PLANNING' | 'DESIGNING' | 'EXECUTING' | 'REVIEW' | 'TESTING';
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface LeadDocument {
    id: number;
    name: string;
    file_path: string;
    uploaded_at: string;
}

export interface AuditLog {
    id: number;
    actor_name: string;
    action: string;
    from_stage: string;
    to_stage: string;
    timestamp: string;
    notes: string;
}

export enum Emirate {
    DUBAI = 'DUBAI',
    ABU_DHABI = 'ABU_DHABI',
    SHARJAH = 'SHARJAH',
    AJMAN = 'AJMAN',
    UMM_AL_QUWAIN = 'UMM_AL_QUWAIN',
    RAS_AL_KHAIMAH = 'RAS_AL_KHAIMAH',
    FUJAIRAH = 'FUJAIRAH'
}

export interface Lead {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    emirate?: string;

    // IT/Agency Specifics
    company_name?: string;
    tech_requirements?: string;

    // Financials
    project_amount?: number;
    advance_amount?: number;
    remaining_amount?: number;

    reminder_date?: string;

    stage: LeadStage;
    status?: LeadStatus;
    remarks?: string;
    assigned_team: Team;
    assigned_to?: number;
    assigned_to_name?: string;
    lead_generator?: number;
    lead_generator_name?: string;
    tech_pipeline_id?: number; // Optional reference
    tech_pipeline?: TechPipeline; // Nested object if fetched
    last_contacted?: string;
    next_followup?: string;
    documents: LeadDocument[];
    audit_logs: AuditLog[];
    created_at: string;
    updated_at: string;
}
