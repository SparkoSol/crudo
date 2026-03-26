import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: corsHeaders },
      );
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: corsHeaders },
      );
    }

    // Admin client — can do anything
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the calling user is authenticated and is a manager
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } =
      await adminClient.auth.getUser(token);

    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders },
      );
    }

    // Verify caller's role is manager
    const { data: callerProfile, error: profileErr } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", callerUser.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== "manager") {
      return new Response(
        JSON.stringify({ error: "Only managers can delete users" }),
        { status: 403, headers: corsHeaders },
      );
    }

    // Parse request body
    const { profileId } = await req.json();

    if (!profileId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: profileId" }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Verify the target user belongs to this manager
    const { data: targetProfile, error: targetErr } = await adminClient
      .from("profiles")
      .select("id, manager_id, role")
      .eq("id", profileId)
      .single();

    if (targetErr || !targetProfile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: corsHeaders },
      );
    }

    if (targetProfile.manager_id !== callerUser.id) {
      return new Response(
        JSON.stringify({ error: "You can only delete users in your team" }),
        { status: 403, headers: corsHeaders },
      );
    }

    if (targetProfile.role === "manager") {
      return new Response(
        JSON.stringify({ error: "Cannot delete a manager account this way" }),
        { status: 403, headers: corsHeaders },
      );
    }

    // --- Data cleanup before deletion ---

    // 1. Delete all voice_transcripts belonging to the user
    const { error: transcriptErr } = await adminClient
      .from("voice_transcripts")
      .delete()
      .eq("user_id", profileId);

    if (transcriptErr) {
      console.error("Error deleting transcripts:", transcriptErr);
      // Non-fatal — continue
    }

    // 2. Delete phone_number_mappings for the user
    const { error: mappingErr } = await adminClient
      .from("phone_number_mappings")
      .delete()
      .eq("user_id", profileId);

    if (mappingErr) {
      console.error("Error deleting phone mappings:", mappingErr);
      // Non-fatal — continue
    }

    // 3. Delete the profile row (cascade handles any remaining FK children)
    const { error: profileDeleteErr } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (profileDeleteErr) {
      console.error("Error deleting profile:", profileDeleteErr);
      return new Response(
        JSON.stringify({
          error: "Failed to delete profile",
          details: profileDeleteErr.message,
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    // 4. Finally, delete from Supabase Auth (hard delete)
    const { error: authDeleteErr } = await adminClient.auth.admin.deleteUser(
      profileId,
    );

    if (authDeleteErr) {
      console.error("Error deleting auth user:", authDeleteErr);
      return new Response(
        JSON.stringify({
          error: "Profile deleted but auth account removal failed",
          details: authDeleteErr.message,
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    console.log(
      `User ${profileId} fully deleted by manager ${callerUser.id}`,
    );

    return new Response(
      JSON.stringify({ success: true, deletedUserId: profileId }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err: any) {
    console.error("delete-user function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      { status: 500, headers: corsHeaders },
    );
  }
});
