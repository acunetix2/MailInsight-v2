// src/pages/AuthCallback.tsx

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // IMPORTANT: Required to create a Supabase session after Google redirect
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error("OAuth exchange error:", error);
          navigate("/auth");
          return;
        }

        // success → session now exists
        navigate("/dashboard");
      } catch (err) {
        console.error("Unexpected OAuth error:", err);
        navigate("/auth");
      }
    };

    processOAuthCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
