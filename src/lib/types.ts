export type UserRole = 'seeker' | 'employer' | 'admin' | 'superadmin' | 'freelancer';

export interface UserMeta {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  is_banned?: boolean;
  company_id?: string;
  company_name?: string;
}

export interface SeekerProfile {
  id: string;
  user_id: string;
  full_name: string;
  photo_url: string;
  domicile_city: string;
  domicile_lat?: number;
  domicile_lng?: number;
  about: string;
  phone: string;
  expected_salary_min: number;
  expected_salary_max: number;
  created_at: string;
  updated_at: string;
}

export interface SeekerEducation {
  id: string;
  seeker_id: string;
  school_name: string;
  degree: string;
  major: string;
  start_year?: number;
  end_year?: number;
  is_current: boolean;
  created_at: string;
}

export interface SeekerExperience {
  id: string;
  seeker_id: string;
  company_name: string;
  position: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  description: string;
  created_at: string;
}

export interface SeekerSkill {
  id: string;
  seeker_id: string;
  skill_name: string;
  created_at: string;
}

export interface Company {
  id: string;
  user_id: string;
  name: string;
  industry: string;
  city: string;
  logo_url: string;
  description: string;
  website: string;
  employee_count: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export type JobType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
export type JobStatus = 'active' | 'closed' | 'draft';

export interface JobListing {
  id: string;
  company_id: string;
  title: string;
  category: string;
  location_city: string;
  job_type: JobType;
  salary_min: number;
  salary_max: number;
  description: string;
  requirements: string;
  quota: number;
  status: JobStatus;
  created_at: string;
  expires_at?: string;
  updated_at: string;
  companies?: Company;
}

export type ApplicationStatus =
  | 'applied'
  | 'reviewed'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'hired'
  | 'rejected'
  | 'expired';

export interface Application {
  id: string;
  job_id: string;
  seeker_id: string;
  status: ApplicationStatus;
  applied_at: string;
  updated_at: string;
  job_listings?: JobListing;
  seeker_profiles?: SeekerProfile;
}

export interface InterviewInvitation {
  id: string;
  application_id: string;
  scheduled_at: string;
  location_or_link: string;
  notes: string;
  seeker_confirmed?: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  totalSeekers: number;
  totalEmployers: number;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  pendingApplications: number;
  totalCompanies: number;
  verifiedCompanies: number;
  newUsersToday: number;
  newJobsToday: number;
  newApplicationsToday: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  full_name?: string;
  company_name?: string;
  is_banned?: boolean;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: string;
  created_at: string;
  admin_email?: string;
}

export interface ChartDataPoint {
  date: string;
  seekers: number;
  employers: number;
  jobs: number;
  applications: number;
}

export type AvailabilityStatus = 'fulltime' | 'freelance' | 'parttime' | 'remote';
export type RateType = 'monthly' | 'hourly' | 'project';

export interface TalentMarketplacePost {
  id: string;
  seeker_id: string;
  user_id: string;
  headline: string;
  category: string;
  bio: string;
  bio_summary?: string;
  skills: string[] | string;
  experience_years: number;
  availability: AvailabilityStatus | string;
  availability_status?: AvailabilityStatus;
  work_types?: string[];
  expected_salary: number;
  rate_type: RateType;
  domicile_city: string;
  whatsapp_number: string;
  portfolio_url?: string;
  resume_url?: string;
  badge?: string;
  photo_url?: string;
  views_count: number;
  is_published: boolean | number;
  created_at: string;
  updated_at: string;
  seeker_profiles?: Partial<SeekerProfile>;
}

export interface DirectJobOffer {
  id: string;
  post_id: string;
  seeker_id: string;
  employer_id: string;
  company_id: string;
  job_id?: string;
  position_title: string;
  offered_salary: number;
  message: string;
  whatsapp_contact?: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  companies?: Company;
  job_listings?: Pick<JobListing, 'id' | 'title' | 'category' | 'salary_min' | 'salary_max'>;
}

export type ProductCategory = 'digital' | 'second' | 'other';
export type ProductCondition = 'Baru' | 'Sekon (Second)' | 'Digital';
export type ProductPriceType = 'fixed' | 'nego';
export type ProductStatus = 'available' | 'sold' | 'reserved';

export interface MarketplaceProduct {
  id: string;
  user_id: string;
  seller_name: string;
  seller_role: UserRole | string;
  seller_verified: boolean;
  seller_avatar?: string;
  seller_whatsapp: string;
  seller_city: string;
  title: string;
  category: ProductCategory;
  sub_category?: string;
  condition: ProductCondition;
  price: number;
  price_type: ProductPriceType;
  images: string[];
  description: string;
  stock: number;
  status: ProductStatus;
  digital_download_url?: string;
  views_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceTransaction {
  id: string;
  product_id: string;
  product_title: string;
  product_price: number;
  product_image?: string;
  buyer_id: string;
  buyer_name: string;
  buyer_whatsapp: string;
  seller_id: string;
  seller_name: string;
  seller_whatsapp: string;
  offer_price: number;
  notes?: string;
  payment_method: 'escrow_loxer' | 'cod' | 'transfer' | 'whatsapp';
  status: 'pending' | 'agreed' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

