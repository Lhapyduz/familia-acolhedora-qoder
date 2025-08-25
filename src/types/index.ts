// Core user and authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'coordinator' | 'technician';
  permissions: Permission[];
  isActive: boolean;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role: 'coordinator' | 'technician';
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export type Permission = 
  | 'families:read' 
  | 'families:write' 
  | 'families:delete'
  | 'children:read' 
  | 'children:write' 
  | 'children:delete'
  | 'matching:read' 
  | 'matching:write'
  | 'budget:read' 
  | 'budget:write'
  | 'reports:read' 
  | 'reports:write'
  | 'settings:read' 
  | 'settings:write'
  | 'users:read' 
  | 'users:write'
  | 'users:delete';

// User management types
export interface CreateUserRequest {
  email: string;
  name: string;
  role: 'coordinator' | 'technician';
  permissions: Permission[];
  isActive: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: 'coordinator' | 'technician';
  permissions?: Permission[];
  isActive?: boolean;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  coordinators: number;
  technicians: number;
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  timestamp: Date;
  details: string;
}

// Address and contact information
export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Contact {
  name: string;
  cpf: string;
  phone: string;
  email: string;
}

// Family related types
export interface FamilyMember {
  id: string;
  name: string;
  cpf: string;
  birthDate: Date;
  relationship: 'parent' | 'child' | 'grandparent' | 'sibling' | 'other';
  occupation?: string;
  income?: number;
}

export interface FamilyPreferences {
  ageRange: {
    min: number;
    max: number;
  };
  gender: 'any' | 'male' | 'female';
  specialNeeds: boolean;
  maxChildren: number;
  siblingGroups: boolean;
}

export type FamilyStatus = 'available' | 'unavailable' | 'under_evaluation' | 'active_placement';

export interface Family {
  id: string;
  primaryContact: Contact;
  address: Address;
  composition: FamilyMember[];
  status: FamilyStatus;
  preferences: FamilyPreferences;
  limitations: string[];
  history: PlacementHistory[];
  documents: Document[];
  evaluations: Evaluation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFamilyRequest {
  primaryContact: Contact;
  address: Address;
  composition: Omit<FamilyMember, 'id'>[];
  preferences: FamilyPreferences;
  limitations: string[];
}

export interface UpdateFamilyRequest {
  primaryContact?: Partial<Contact>;
  address?: Partial<Address>;
  composition?: FamilyMember[];
  status?: FamilyStatus;
  preferences?: Partial<FamilyPreferences>;
  limitations?: string[];
}

// Children related types
export interface ChildPersonalInfo {
  name: string;
  birthDate: Date;
  gender: 'male' | 'female';
  cpf?: string;
  birthCertificate: string;
}

export interface SpecialNeeds {
  hasSpecialNeeds: boolean;
  healthConditions: string[];
  medications: string[];
  educationalNeeds: string[];
  therapeuticNeeds: string[];
}

export interface FamilyBackground {
  originFamily: string;
  siblings: string[];
  communityTies: string[];
  culturalConsiderations: string[];
}

export interface LegalStatus {
  courtOrder: string;
  legalGuardian: string;
  placementDate?: Date;
  expectedDuration?: number;
  caseWorker: string;
}

export type ChildStatus = 'awaiting' | 'in_placement' | 'discharged' | 'returned_family';

// Enhanced status workflow types
export interface StatusTransition {
  from: ChildStatus;
  to: ChildStatus;
  isAllowed: boolean;
  requiresConfirmation: boolean;
  requiredRole?: UserRole;
  reason?: string;
}

export interface StatusChangeRequest {
  childId: string;
  newStatus: ChildStatus;
  reason: string;
  effectiveDate?: Date;
  notes?: string;
  requestedBy: string;
}

export interface StatusHistory {
  id: string;
  childId: string;
  previousStatus: ChildStatus;
  newStatus: ChildStatus;
  changeDate: Date;
  reason: string;
  notes?: string;
  changedBy: string;
  approvedBy?: string;
  approvalDate?: Date;
}

export interface StatusWorkflowRules {
  transitions: StatusTransition[];
  notifications: {
    statusChange: boolean;
    approvalRequired: boolean;
    deadline: boolean;
  };
}

export interface ChildStatusStats {
  awaiting: number;
  in_placement: number;
  discharged: number;
  returned_family: number;
  total: number;
}

export interface Child {
  id: string;
  personalInfo: ChildPersonalInfo;
  currentStatus: ChildStatus;
  specialNeeds: SpecialNeeds;
  familyBackground: FamilyBackground;
  legalStatus: LegalStatus;
  currentPlacement?: CurrentPlacement;
  documents: ChildDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChildRequest {
  personalInfo: ChildPersonalInfo;
  specialNeeds: SpecialNeeds;
  familyBackground: FamilyBackground;
  legalStatus: LegalStatus;
}

export interface UpdateChildRequest {
  personalInfo?: Partial<ChildPersonalInfo>;
  currentStatus?: ChildStatus;
  specialNeeds?: Partial<SpecialNeeds>;
  familyBackground?: Partial<FamilyBackground>;
  legalStatus?: Partial<LegalStatus>;
  documents?: ChildDocument[];
}

// Placement related types
export type PlacementStatus = 'active' | 'completed' | 'interrupted' | 'transferred';

export interface CurrentPlacement {
  familyId: string;
  startDate: Date;
  endDate?: Date;
  status: PlacementStatus;
}

export interface ApproximationStage {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  completedDate?: Date;
  notes?: string;
}

export interface ApproximationProcess {
  stages: ApproximationStage[];
  currentStage: string;
  startDate: Date;
  expectedDuration: number;
}

export interface Placement {
  id: string;
  childId: string;
  familyId: string;
  startDate: Date;
  endDate?: Date;
  status: PlacementStatus;
  approximationProcess: ApproximationProcess;
  reports: PlacementReport[];
  visits: TechnicalVisit[];
  budget: PlacementBudget;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlacementBudget {
  monthlyAllocation: number;
  totalCost: number;
  paymentHistory: Payment[];
}

export interface Payment {
  id: string;
  amount: number;
  date: Date;
  description: string;
  status: 'pending' | 'completed' | 'failed';
}

// Budget related types
export interface BudgetSettings {
  minimumWage: number;
  siblingMultiplier: number; // 30%
  specialNeedsMultiplier: number; // 50%
}

export interface BudgetAllocation {
  id: string;
  placementId: string;
  monthlyAmount: number;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface BudgetTransaction {
  id: string;
  type: 'allocation' | 'payment' | 'adjustment';
  amount: number;
  description: string;
  date: Date;
  placementId?: string;
  createdBy: string;
}

export interface Budget {
  id: string;
  fiscalYear: number;
  totalAmount: number;
  allocatedAmount: number;
  availableAmount: number;
  allocations: BudgetAllocation[];
  transactions: BudgetTransaction[];
  settings: BudgetSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetSummary {
  totalBudget: number;
  allocatedBudget: number;
  availableBudget: number;
  activePlacements: number;
  monthlyAllocations: BudgetAllocation[];
}

export interface BudgetValidation {
  isValid: boolean;
  totalCost: number;
  availableBudget: number;
  shortage: number;
}

// Matching and compatibility types
export interface CompatibilityFactors {
  ageRange: number;
  specialNeeds: number;
  familySize: number;
  experience: number;
  availability: number;
}

export interface CompatibilityScore {
  familyId: string;
  childId: string;
  overallScore: number;
  factors: CompatibilityFactors;
  recommendation: 'high' | 'medium' | 'low';
  notes: string[];
}

export interface Matching {
  id: string;
  childId: string;
  familyId: string;
  compatibilityScore: CompatibilityScore;
  status: 'proposed' | 'approved' | 'rejected' | 'completed';
  proposedBy: string;
  proposedDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// Documents and reports
export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadDate: Date;
  uploadedBy: string;
  size: number;
  mimeType: string;
}

// Enhanced document management types
export interface ChildDocument extends Document {
  childId: string;
  category: DocumentCategory;
  isRequired: boolean;
  expirationDate?: Date;
  status: DocumentStatus;
  description?: string;
  tags: string[];
  accessLevel: 'public' | 'restricted' | 'confidential';
  retentionPolicy?: {
    retainUntil: Date;
    reason: string;
  };
}

export type DocumentCategory = 
  | 'birth_certificate'
  | 'medical_records'
  | 'legal_documents'
  | 'psychological_reports'
  | 'educational_records'
  | 'photos'
  | 'court_orders'
  | 'placement_reports'
  | 'visit_reports'
  | 'other';

export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'archived';

export interface DocumentUploadRequest {
  file: File;
  category: DocumentCategory;
  description?: string;
  isRequired?: boolean;
  expirationDate?: Date;
  tags?: string[];
  accessLevel?: 'public' | 'restricted' | 'confidential';
}

export interface DocumentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileSize: number;
  mimeType: string;
}

export interface DocumentSearchFilters {
  category?: DocumentCategory;
  status?: DocumentStatus;
  uploadedBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  accessLevel?: string;
  expiringSoon?: boolean;
}

export interface DocumentStats {
  total: number;
  byCategory: Record<DocumentCategory, number>;
  byStatus: Record<DocumentStatus, number>;
  expiringSoon: number;
  requiresAction: number;
}

export interface PlacementReport {
  id: string;
  placementId: string;
  reportType: 'monthly' | 'quarterly' | 'annual' | 'incident';
  reportDate: Date;
  createdBy: string;
  content: string;
  attachments: Document[];
  status: 'draft' | 'submitted' | 'approved';
}

export interface TechnicalVisit {
  id: string;
  placementId: string;
  visitDate: Date;
  technicianId: string;
  purpose: string;
  observations: string;
  recommendations: string[];
  followUpRequired: boolean;
  nextVisitDate?: Date;
}

export interface Evaluation {
  id: string;
  familyId: string;
  evaluatorId: string;
  evaluationDate: Date;
  type: 'initial' | 'periodic' | 'reassessment';
  score: number;
  comments: string;
  recommendations: string[];
  status: 'approved' | 'conditional' | 'rejected';
}

// Notification system types
export interface Notification {
  id: string;
  userId: string;
  type: 'report_due' | 'visit_reminder' | 'placement_update' | 'budget_alert' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  scheduledFor?: Date;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// Statistics and reporting types
export interface Statistics {
  totalFamilies: number;
  availableFamilies: number;
  totalChildren: number;
  childrenInPlacement: number;
  childrenAwaiting: number;
  activePlacements: number;
  completedPlacements: number;
  averagePlacementDuration: number;
  budgetUtilization: number;
  monthlyStats: MonthlyStatistics[];
}

export interface MonthlyStatistics {
  month: string;
  year: number;
  newFamilies: number;
  newChildren: number;
  newPlacements: number;
  completedPlacements: number;
  budgetSpent: number;
}

// Filter and search types
export interface FamilyFilters {
  status?: FamilyStatus[];
  availableAgeRange?: { min: number; max: number };
  hasSpecialNeedsCapacity?: boolean;
  city?: string;
  state?: string;
}

export interface ChildFilters {
  status?: ChildStatus[];
  ageRange?: { min: number; max: number };
  gender?: 'male' | 'female';
  hasSpecialNeeds?: boolean;
  hasSiblings?: boolean;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Form validation types
export interface FormErrors {
  [key: string]: string | undefined;
}

export interface FormState<T> {
  values: T;
  errors: FormErrors;
  isSubmitting: boolean;
  isValid: boolean;
}

// PlacementHistory type
export interface PlacementHistory {
  id: string;
  childId: string;
  familyId: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  outcome: 'successful' | 'interrupted' | 'transferred';
  reason?: string;
}

// Report-specific types
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'custom' | 'budget' | 'families' | 'children' | 'placements';
  sections: ReportSection[];
  parameters: ReportParameter[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'statistics' | 'chart' | 'table' | 'text' | 'summary';
  config: Record<string, any>;
  order: number;
}

export interface ReportParameter {
  id: string;
  name: string;
  label: string;
  type: 'date' | 'dateRange' | 'select' | 'multiSelect' | 'number' | 'text';
  required: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  name: string;
  generatedBy: string;
  generatedAt: Date;
  parameters: Record<string, any>;
  data: ReportData;
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  period?: {
    startDate: Date;
    endDate: Date;
  };
  sections: ReportSectionData[];
  summary?: ReportSummary;
  charts?: ChartData[];
  tables?: TableData[];
}

export interface ReportSectionData {
  id: string;
  title: string;
  type: 'statistics' | 'chart' | 'table' | 'text' | 'summary';
  content: any;
  order: number;
}

export interface ReportSummary {
  totalFamilies: number;
  totalChildren: number;
  activePlacements: number;
  newPlacements: number;
  completedPlacements: number;
  budgetAllocated: number;
  budgetSpent: number;
  successRate: number;
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
      fill?: boolean;
    }[];
  };
  options?: Record<string, any>;
}

export interface TableData {
  id: string;
  title: string;
  headers: string[];
  rows: (string | number)[][];
  totals?: (string | number)[];
}

export interface ReportExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCover: boolean;
  includeCharts: boolean;
  includeTables: boolean;
  pageOrientation: 'portrait' | 'landscape';
  fontSize: 'small' | 'medium' | 'large';
}

export interface ScheduledReport {
  id: string;
  templateId: string;
  name: string;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string; // HH:mm format
  };
  parameters: Record<string, any>;
  recipients: string[]; // email addresses
  isActive: boolean;
  lastGenerated?: Date;
  nextGeneration: Date;
  createdBy: string;
  createdAt: Date;
}

// Export commonly used utility types
export type UserRole = User['role'];
export type EntityId = string;
export type DateString = string;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// LGPD Audit Logging Types
export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  details: AuditDetails;
  metadata: AuditMetadata;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  legacyData?: any; // For data before modification
  newData?: any; // For data after modification
}

export type AuditAction = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'search'
  | 'view'
  | 'download'
  | 'approve'
  | 'reject'
  | 'suspend'
  | 'activate'
  | 'archive'
  | 'restore';

export type AuditResource = 
  | 'user'
  | 'family'
  | 'child'
  | 'placement'
  | 'document'
  | 'report'
  | 'budget'
  | 'notification'
  | 'settings'
  | 'visit'
  | 'evaluation'
  | 'authentication';

export interface AuditDetails {
  description: string;
  changes?: AuditFieldChange[];
  reason?: string;
  context?: string;
  sensitivity: AuditSensitivity;
  personalDataAccessed?: string[]; // List of personal data fields accessed
  legalBasis?: LGPDLegalBasis;
}

export interface AuditFieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  fieldType: 'personal' | 'sensitive' | 'administrative' | 'system';
}

export type AuditSensitivity = 'low' | 'medium' | 'high' | 'critical';

export type LGPDLegalBasis = 
  | 'consent' // Consent of the data subject
  | 'contract' // Performance of a contract
  | 'legal_obligation' // Compliance with legal obligation
  | 'vital_interests' // Protection of vital interests
  | 'public_task' // Performance of task in public interest
  | 'legitimate_interests' // Legitimate interests
  | 'child_protection'; // Special category for child protection

export interface AuditMetadata {
  source: 'web' | 'api' | 'system' | 'import' | 'sync';
  component?: string;
  version?: string;
  correlationId?: string;
  parentAuditId?: string;
  businessProcess?: string;
  complianceFlags?: LGPDComplianceFlag[];
}

export type LGPDComplianceFlag = 
  | 'data_minimization'
  | 'purpose_limitation'
  | 'accuracy'
  | 'storage_limitation'
  | 'integrity_confidentiality'
  | 'consent_required'
  | 'data_subject_rights'
  | 'cross_border_transfer';

export interface AuditSearchCriteria {
  userId?: string;
  actions?: AuditAction[];
  resources?: AuditResource[];
  resourceId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sensitivity?: AuditSensitivity[];
  legalBasis?: LGPDLegalBasis[];
  personalDataAccessed?: string[];
  searchTerm?: string;
  ipAddress?: string;
  sessionId?: string;
}

export interface AuditSummary {
  totalEvents: number;
  eventsByAction: Record<AuditAction, number>;
  eventsByResource: Record<AuditResource, number>;
  eventsBySensitivity: Record<AuditSensitivity, number>;
  personalDataAccesses: number;
  sensitiveDataAccesses: number;
  complianceViolations: number;
  uniqueUsers: number;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface DataSubjectRequest {
  id: string;
  subjectId: string; // Child or Family ID
  subjectType: 'child' | 'family';
  requestType: DataSubjectRequestType;
  status: DataSubjectRequestStatus;
  requestedBy: string;
  requestedAt: Date;
  processedBy?: string;
  processedAt?: Date;
  reason?: string;
  details?: string;
  attachments?: Document[];
  auditTrail: AuditLog[];
}

export type DataSubjectRequestType = 
  | 'access' // Right to access
  | 'rectification' // Right to rectification
  | 'erasure' // Right to erasure (right to be forgotten)
  | 'restriction' // Right to restriction of processing
  | 'portability' // Right to data portability
  | 'objection' // Right to object
  | 'automated_processing'; // Rights related to automated decision-making

export type DataSubjectRequestStatus = 
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export interface LGPDComplianceReport {
  id: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: AuditSummary;
  violations: LGPDViolation[];
  dataSubjectRequests: DataSubjectRequestSummary;
  recommendations: string[];
  nextAuditDate: Date;
}

export interface LGPDViolation {
  id: string;
  type: LGPDViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  auditLogIds: string[];
  correctionActions?: string[];
}

export type LGPDViolationType = 
  | 'unauthorized_access'
  | 'data_breach'
  | 'excessive_data_collection'
  | 'purpose_deviation'
  | 'retention_violation'
  | 'consent_violation'
  | 'cross_border_violation'
  | 'security_violation';

export interface DataSubjectRequestSummary {
  total: number;
  byType: Record<DataSubjectRequestType, number>;
  byStatus: Record<DataSubjectRequestStatus, number>;
  averageProcessingTime: number; // in days
  pendingRequests: number;
}

export interface AuditConfiguration {
  retentionPeriod: number; // in days
  autoArchive: boolean;
  realTimeMonitoring: boolean;
  sensitiveDataAlerts: boolean;
  complianceChecks: boolean;
  exportFormats: ('json' | 'csv' | 'pdf')[];
  encryptionEnabled: boolean;
  anonymizationRules: AnonymizationRule[];
}

export interface AnonymizationRule {
  field: string;
  method: 'hash' | 'mask' | 'remove' | 'pseudonymize';
  applyAfter: number; // days
  exceptions?: string[]; // Legal reasons to keep data
}