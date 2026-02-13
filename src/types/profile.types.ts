// export interface Profile {
//   id: string;
//   role: 'manager' | 'sales_representative';
//   manager_id: string | null;
//   full_name: string | null;
//   phone_number: string | null;
//   company_name: string | null;
//   email: string;
//   created_at: string;
//   updated_at: string;
// }

// export interface UpdateProfileData {
//   full_name?: string;
//   phone_number?: string;
//   email?: string;
// }

// export interface ProfileWithManager extends Profile {
//   manager?: Profile | null;
// }
export interface Profile {
  id: string;
  role: "manager" | "sales_representative";
  manager_id: string | null;

  full_name: string | null;
  phone_number: string | null;
  whatsapp_number: string | null; // ✅ NEW
  company_name: string | null;

  email: string;

  is_active: boolean; // ✅ NEW
  template_id: string | null; // ✅ NEW

  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  full_name?: string;
  phone_number?: string;
  whatsapp_number?: string; // ✅ NEW
  email?: string;
  is_active?: boolean; // ✅ NEW
  template_id?: string | null; // ✅ NEW
}

export interface ProfileWithManager extends Profile {
  manager?: Profile | null;
}
