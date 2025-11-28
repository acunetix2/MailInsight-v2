import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
};

const EmailAnalysisSchema = z.object({
  userId: z.string().min(1),
  emailId: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  sender: z.string().min(1).max(255),
  senderEmail: z.string().email().max(255),
  content: z.string().min(1).max(50000),
  receivedDate: z.string().datetime(),
  hasAttachments: z.boolean(),
});

type EmailAnalysisRequest = z.infer<typeof EmailAnalysisSchema>;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse and validate request body
    const body = await req.json();
    const parsed = EmailAnalysisSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.errors.map(err => ({
        field: err.path.join("."),
        message: err.message,
      }));
      console.error("Validation failed:", errors);
      return new Response(
        JSON.stringify({ error: "Invalid request data", details: errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailData = parsed.data;
    console.log("Analyzing email for user:", emailData.userId);

    // Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user exists
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", emailData.userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // OpenAI integration
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an advanced email security analyst AI. Return a JSON object with:
- riskScore (0-100)
- riskLevel ("safe" | "suspicious" | "dangerous")
- threatIndicators (array)
- analysisSummary (string)`
        },
        {
          role: "user",
          content: `Analyze this email:

Subject: ${emailData.subject}
Sender: ${emailData.sender} <${emailData.senderEmail}>
Has Attachments: ${emailData.hasAttachments}
Content: ${emailData.content.substring(0, 2000)}`
        }
      ],
    });

    // Parse AI response safely
    const analysisText = completion.choices[0]?.message?.content || "";
    let analysis;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = {
          riskScore: 15,
          riskLevel: "safe",
          threatIndicators: [],
          analysisSummary: analysisText.substring(0, 500),
        };
      }
    } catch {
      analysis = {
        riskScore: 15,
        riskLevel: "safe",
        threatIndicators: ["Unable to parse AI analysis"],
        analysisSummary: analysisText.substring(0, 500),
      };
    }

    // Insert result into Supabase
	const { data: scanResult, error: dbError } = await supabaseClient
	  .from("email_scans")
	  .insert({
		user_id: emailData.userId,
		email_id: emailData.emailId,
		subject: emailData.subject,
		sender: emailData.sender,
		sender_email: emailData.senderEmail,
		preview: emailData.content.substring(0, 200),
		received_date: emailData.receivedDate,
		risk_score: analysis.riskScore.toString(),                      
		risk_level: analysis.riskLevel,
		threat_indicators: JSON.stringify(analysis.threatIndicators),   
		analysis_summary: analysis.analysisSummary,
		content_preview: emailData.content.substring(0, 500),
		has_attachments: emailData.hasAttachments.toString(),           
	  })
	  .select()
	  .single();


    if (dbError) throw dbError;

    console.log("Email analysis stored:", scanResult.id);

    return new Response(JSON.stringify(scanResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in analyze-email function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
