export interface Profile {
  id: string;
  role: 'manager' | 'sales_representative';
  manager_id: string | null;
  full_name: string | null;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  full_name?: string;
  email?: string;
}

export interface ProfileWithManager extends Profile {
  manager?: Profile | null;
}
