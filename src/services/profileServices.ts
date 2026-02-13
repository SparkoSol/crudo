import { supabase } from "../lib/supabase/client";
import type { Profile, UpdateProfileData } from "../types/profile.types";

export const getProfile = async (userId?: string): Promise<Profile | null> => {
  let userIdToUse = userId;

  if (!userIdToUse) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      throw new Error("No authenticated user");
    }
    userIdToUse = session.user.id;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userIdToUse)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data;
};

export const updateProfile = async (
  updates: UpdateProfileData,
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

export const getManagedProfiles = async (): Promise<Profile[]> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("No authenticated user");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("manager_id", session.user.id);

  if (error) {
    throw error;
  }

  return data as Profile[];
};

export const unlinkPhoneNumber = async (profileId: string): Promise<void> => {
  const { error } = await supabase
    .from("profiles")
    .update({ phone_number: null, updated_at: new Date().toISOString() })
    .eq("id", profileId);

  if (error) {
    throw error;
  }
};
