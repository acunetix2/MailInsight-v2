import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EmailAnalysisSchema = z.object({
  emailId: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  sender: z.string().min(1).max(255),
  senderEmail: z.string().email().max(255),
  content: z.string().min(1).max(50000),
  receivedDate: z.string().datetime(),
  hasAttachments: z.boolean(),
  riskScore: z.number().min(0).max(100),
  riskLevel: z.enum(["safe", "suspicious", "dangerous"]),
  threatIndicators: z.array(z.string()),
  analysisSummary: z.string(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401, headers: corsHeaders });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", details: userError?.message || "Invalid token" }), { status: 401, headers: corsHeaders });
    }

    const requestBody = await req.json();
    const validationResult = EmailAnalysisSchema.partial().safeParse(requestBody);

    if (!validationResult.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: validationResult.error.errors }), { status: 400, headers: corsHeaders });
    }

    const emailData = validationResult.data;

    // OpenAI integration
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // use "gpt-4" for full GPT-4 access if paid
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant that explains email security scans to end users in plain language."
        },
        {
          role: "user",
          content: `Here is the scanned email data:
Subject: ${emailData.subject}
Sender: ${emailData.sender} <${emailData.senderEmail}>
Has Attachments: ${emailData.hasAttachments}
Risk Score: ${emailData.riskScore}
Risk Level: ${emailData.riskLevel}
Threat Indicators: ${emailData.threatIndicators.join(", ")}
Analysis Summary: ${emailData.analysisSummary}

Explain in simple, understandable terms what this email's threats are and what the user should be aware of.`
        }
      ],
    });

    const assistantReply = completion.choices[0]?.message?.content ?? "No explanation available.";

    return new Response(JSON.stringify({ explanation: assistantReply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
