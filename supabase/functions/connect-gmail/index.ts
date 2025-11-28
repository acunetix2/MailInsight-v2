import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConnectRequest {
  action: "connect" | "disconnect";
  code?: string;
  refresh_token?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ConnectRequest = await req.json();

    if (body.action === "connect") {
      let finalRefreshToken = body.refresh_token;

      if (body.code && !finalRefreshToken) {
        const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
        const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
        const redirectUri = `${req.headers.get("origin") || ""}/settings`;

        if (!clientId || !clientSecret) {
          return new Response(
            JSON.stringify({ error: "Google OAuth not configured" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: body.code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.text();
          console.error("Token exchange failed:", errorData);
          return new Response(
            JSON.stringify({ error: "Failed to exchange authorization code" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const tokenData = await tokenResponse.json();
        finalRefreshToken = tokenData.refresh_token;

        if (!finalRefreshToken) {
          return new Response(
            JSON.stringify({ error: "No refresh token received from Google" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (!finalRefreshToken) {
        return new Response(
          JSON.stringify({ error: "Refresh token is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({
          gmail_refresh_token: finalRefreshToken,
          gmail_connected: true,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to update profile:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to connect Gmail" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Gmail connected successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } 
    else if (body.action === "disconnect") {
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({
          gmail_refresh_token: null,
          gmail_connected: false,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to update profile:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to disconnect Gmail" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Gmail disconnected successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } 
    else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } 
  catch (error: any) {
    console.error("Error in connect-gmail function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
