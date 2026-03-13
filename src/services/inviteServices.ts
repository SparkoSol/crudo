import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseServiceRoleKey } from "../config/env";
import { BrevoUtils } from "./brevo";
import { BrevoTemplates } from "@/types";
import type { InviteSalesRepresentativeData, InviteResponse } from "@/types";

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
  companyName: string | null,
  phoneNumber: string | null,
  templateId: string | null
): Promise<void> => {
  const { error } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    email: email,
    full_name: fullName,
    role: "sales_representative",
    manager_id: managerId,
    company_name: companyName,
    phone_number: phoneNumber,
    template_id: templateId,
  });

  if (error) {
    throw new Error(error.message || "Failed to create profile");
  }
};

export const inviteSalesRepresentative = async (
  data: InviteSalesRepresentativeData
): Promise<InviteResponse> => {
  try {
    const password = generatePassword();

    const { userId } = await createAuthUser(data.email, password);

    await createProfile(
      userId,
      data.email,
      data.managerId,
      data.fullName,
      data.managerCompanyName || null,
      data.phoneNumber || null,
      data.templateId || null
    );

    try {
      await BrevoUtils.send(
        BrevoTemplates.InviteSalesPerson,
        {
          company_name: data.managerCompanyName || "iNotus",
          user_name: data.email,
          password: password,
        },
        data.email,
        data.fullName
      );
      console.log("Invitation email sent successfully");
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
    }

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
