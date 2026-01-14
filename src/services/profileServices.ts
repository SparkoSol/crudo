import { supabase } from "../lib/supabase/client";
import type { Profile, UpdateProfileData } from "../types/profile.types";

export const getProfile = async (): Promise<Profile | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("No authenticated user");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const updateProfile = async (
  updates: UpdateProfileData
): Promise<Profile> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("No authenticated user");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const getProfileById = async (id: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
};
