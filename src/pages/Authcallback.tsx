// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Authcallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase automatically processes OAuth redirect
    // Just check if a session exists and redirect
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard"); // redirect after login
      } else {
        navigate("/login"); // fallback if something goes wrong
      }
    };
    checkSession();
  }, [navigate]);

  return <div>Loading...</div>;
}
