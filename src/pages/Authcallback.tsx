// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthRedirect = async () => {
      try {
        // Parse OAuth URL and store session
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        
        if (error) {
          console.error("OAuth callback error:", error.message);
          navigate("/auth"); // fallback
          return;
        }

        if (data.session) {
          navigate("/dashboard"); // success
        } else {
          navigate("/auth"); // fallback
        }
      } catch (err) {
        console.error("Unexpected OAuth error:", err);
        navigate("/auth");
      }
    };

    handleOAuthRedirect();
  }, [navigate]);

  return <div>Loading...</div>;
}
