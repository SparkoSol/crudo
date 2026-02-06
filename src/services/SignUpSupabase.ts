import { supabase } from "../lib/supabase/client";
import type { SignupData } from "@/types";

export const signupSupabase = async (data: SignupData) => {
  try {
    // Supabase Auth Signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          company_name: data.company_name,
        },
      },
    });

    if (authError) {
      throw authError;
    }

    const user = authData.user;
    if (!user) {
      throw new Error("User not created");
    }

    // Insert profile in "profiles" table
    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: data.full_name,
      company_name: data.company_name,
      email: data.email,
      role: "manager",
      manager_id: null,
    });

    if (profileError) {
      // If profile creation fails, try to clean up the auth user
      console.error("Profile creation failed:", profileError);
      throw new Error(
        profileError.message || "Failed to create profile. Please try again."
      );
    }

    return user;
  } catch (err: any) {
    const errorMessage =
      err.message || "An error occurred during signup. Please try again.";
    throw new Error(errorMessage);
  }
};
