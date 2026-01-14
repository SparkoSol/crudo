import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseServiceRoleKey } from "../config/env";

export interface InviteSalesRepresentativeData {
  email: string;
  managerId: string;
  managerFullName: string | null;
  managerCompanyName?: string | null;
}

export interface InviteResponse {
  userId: string;
  email: string;
  password: string;
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const generatePassword = (): string => {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";

  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  password += "0123456789"[Math.floor(Math.random() * 10)];
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)];

  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

const generateSalesRepName = (
  managerFullName: string | null,
  managerCompanyName?: string | null
): string => {
  const baseName = managerCompanyName || managerFullName || "Company";
  return `${baseName} - Sales Representative`;
};

const createAuthUser = async (
  email: string,
  password: string
): Promise<{ userId: string }> => {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw new Error(error.message || "Failed to create user");
  }

  if (!data.user) {
    throw new Error("User creation succeeded but no user data returned");
  }

  return { userId: data.user.id };
};

const createProfile = async (
  userId: string,
  email: string,
  managerId: string,
  fullName: string,
  companyName: string | null
): Promise<void> => {
  const { error } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    email: email,
    full_name: fullName,
    role: "sales_representative",
    manager_id: managerId,
    company_name: companyName,
  });

  if (error) {
    throw new Error(error.message || "Failed to create profile");
  }
};

// Email service is not implemented yet
// const sendInvitationEmail = async (
//   email: string,
//   password: string
// ): Promise<void> => {
//   // TODO: Implement email sending service
// };

export const inviteSalesRepresentative = async (
  data: InviteSalesRepresentativeData
): Promise<InviteResponse> => {
  try {
    const password = generatePassword();

    const { userId } = await createAuthUser(data.email, password);

    const fullName = generateSalesRepName(
      data.managerFullName,
      data.managerCompanyName
    );

    await createProfile(
      userId,
      data.email,
      data.managerId,
      fullName,
      data.managerCompanyName || null
    );

    console.log("=".repeat(60));
    console.log("NEW USER INVITATION CREDENTIALS");
    console.log("=".repeat(60));
    console.log("Email:", data.email);
    console.log("Password:", password);
    console.log("=".repeat(60));

    // await sendInvitationEmail(data.email, password);

    return {
      userId,
      email: data.email,
      password,
    };
  } catch (error) {
    console.error("Error inviting sales representative:", error);
    throw error;
  }
};
