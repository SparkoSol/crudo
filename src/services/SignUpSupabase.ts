import { supabase } from "../lib/supabaseClient";

interface SignupData {
  full_name: string;
  company_name: string;
  email: string;
  password: string;
}

export const signupSupabase = async (data: SignupData) => {
  try {
    // Supabase Auth Signup
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;
    const user = authData.user;
    if (!user) throw new Error("User not created");

    // Insert profile in "profiles" table
    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: data.full_name,
      company_name: data.company_name,
      email: data.email,
      role: "manager",
      manager_id: null,
    });

    if (profileError) throw profileError;

    return user;
  } catch (err: any) {
    throw new Error(err.message);
  }
};
