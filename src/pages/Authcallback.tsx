// src/pages/AuthCallback.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // Pass window.location.href to ensure PKCE code is used
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) throw error;

        // Wait until session is persisted
        const checkSessionSaved = async () => {
          let session: any = null;
          for (let i = 0; i < 10; i++) { // retry max 10 times
            const { data: currentSession } = await supabase.auth.getSession();
            if (currentSession.session) {
              session = currentSession.session;
              break;
            }
            await new Promise(res => setTimeout(res, 200)); // wait 200ms
          }
          return session;
        };

        const session = await checkSessionSaved();
        if (!session) {
          console.error("Session was not saved properly");
          navigate("/auth");
          return;
        }

        // Success → session is saved, navigate
        navigate("/dashboard");
      } catch (err) {
        console.error("OAuth callback error:", err);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    processOAuthCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return null;
}
