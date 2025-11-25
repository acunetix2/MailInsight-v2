// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Authcallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthRedirect = async () => {
      try {
        // This parses the OAuth response from URL
        const { data: { session }, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });

        if (error) {
          console.error("OAuth callback error:", error.message);
          navigate("/auth"); // fallback to auth page
          return;
        }

        if (session) {
          navigate("/dashboard"); // redirect after successful login
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
