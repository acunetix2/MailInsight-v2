import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Mail,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface EmailScan {
  id: string;
  email_id: string;
  subject: string;
  sender: string;
  sender_email: string;
  preview: string;
  received_date: string;
  risk_score: number;
  risk_level: "safe" | "suspicious" | "dangerous";
  threat_indicators: string[];
  analysis_summary: string;
  is_read: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [emails, setEmails] = useState<EmailScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<"all" | "safe" | "suspicious" | "dangerous">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchEmailScans();
  }, []);

  // Fetch emails from Supabase
  const fetchEmailScans = async () => {
    try {
      const { data, error } = await supabase
        .from("email_scans")
        .select("*")
        .order("received_date", { ascending: false });

      if (error) throw error;
      setEmails((data || []) as EmailScan[]);
    } catch (error: any) {
      console.error("Error fetching emails:", error);
      toast.error("Failed to load email scans");
    } finally {
      setLoading(false);
    }
  };

  // Demo email scanning
  const scanDemoEmails = async () => {
  setScanning(true);
  toast.info("Scanning demo emails...");

  const user = await supabase.auth.getUser(); // Get current logged-in user
  const userId = user.data.user?.id;

  if (!userId) {
    toast.error("User not authenticated");
    setScanning(false);
    return;
  }

  const demoEmails = [
    {
      emailId: `demo-${Date.now()}-1`,
      subject: "Urgent: Verify Your Account Now!",
      sender: "Security Team",
      senderEmail: "no-reply@secure-bank-verify.com",
      content: "Your account has been suspended. Click here immediately...",
      receivedDate: new Date().toISOString(),
      hasAttachments: false,
    },
    {
      emailId: `demo-${Date.now()}-2`,
      subject: "Meeting Notes - Q4 Planning",
      sender: "Sarah Johnson",
      senderEmail: "sarah.johnson@company.com",
      content: "Hi team, here are the notes from yesterday's Q4 planning meeting...",
      receivedDate: new Date(Date.now() - 3600000).toISOString(),
      hasAttachments: true,
    },
    {
      emailId: `demo-${Date.now()}-3`,
      subject: "Re: Invoice Payment Due",
      sender: "Accounts Payable",
      senderEmail: "payments@vendor-portal.net",
      content: "Dear valued customer, your invoice #12345 is overdue...",
      receivedDate: new Date(Date.now() - 7200000).toISOString(),
      hasAttachments: true,
    },
  ];

  try {
    // Await all function calls and handle individual errors
    const results = await Promise.all(
      demoEmails.map(async (email) => {
        const { data, error } = await supabase.functions.invoke("analyze-email", {
          body: { ...email, userId },
        });

        if (error) {
          console.error(`Analysis failed for email ${email.emailId}:`, error);
          return null;
        }

        return data;
      })
    );

    await fetchEmailScans(); // Refresh the email list
    toast.success("Demo emails scanned successfully!");
  } catch (error: any) {
    console.error("Scan error:", error);
    toast.error(error.message || "Failed to scan demo emails");
  } finally {
    setScanning(false);
  }
};

  // Gmail sync
  const syncGmail = async () => {
    setSyncing(true);
    toast.info("Syncing Gmail...");

    try {
      const { data, error } = await supabase.functions.invoke("sync-gmail");
      if (error) throw error;

      if (data?.analyzed > 0) {
        toast.success(`Successfully analyzed ${data.analyzed} new emails!`);
        await fetchEmailScans();
      } else {
        toast.info("No new emails to analyze");
      }
    } catch (error: any) {
      console.error("Gmail sync error:", error);
      toast.error(error.message || "Failed to sync Gmail. Connect Gmail in Settings.");
    } finally {
      setSyncing(false);
    }
  };

  // Render risk badge
  const getRiskBadge = (riskLevel: string, riskScore: number) => {
    const variants: Record<string, { color: string; icon: any }> = {
      safe: { color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle },
      suspicious: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: AlertTriangle },
      dangerous: { color: "bg-red-500/10 text-red-600 border-red-500/20", icon: AlertTriangle },
    };

    const config = variants[riskLevel] || variants.safe;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border px-3 py-1`}>
        <Icon className="h-3 w-3 mr-1" />
        {riskScore}
      </Badge>
    );
  };

  const filteredEmails = emails.filter((email) => {
    const matchesFilter = filter === "all" || email.risk_level === filter;
    const matchesSearch =
      searchQuery === "" ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.sender.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: emails.length,
    safe: emails.filter((e) => e.risk_level === "safe").length,
    suspicious: emails.filter((e) => e.risk_level === "suspicious").length,
    dangerous: emails.filter((e) => e.risk_level === "dangerous").length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {[
          { label: "Total Scanned", value: stats.total, icon: Mail, color: "text-primary" },
          { label: "Safe", value: stats.safe, icon: CheckCircle, color: "text-green-600" },
          { label: "Suspicious", value: stats.suspicious, icon: AlertTriangle, color: "text-yellow-600" },
          { label: "Dangerous", value: stats.dangerous, icon: AlertTriangle, color: "text-red-600" },
        ].map((stat) => {
          const StatIcon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <StatIcon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          {(["all", "safe", "suspicious", "dangerous"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              size="sm"
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={syncGmail} disabled={syncing || scanning} variant="secondary">
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Gmail
              </>
            )}
          </Button>

          <Button onClick={scanDemoEmails} disabled={scanning || syncing}>
            {scanning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2 text-orange-600" />
                Scan Demo Emails
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Email List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredEmails.length === 0 ? (
        <div className="text-center py-16">
          <Mail className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {emails.length === 0 ? "No Emails Scanned Yet" : "No Emails Found"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {emails.length === 0
              ? "Click 'Scan Demo Emails' to see MailInsight AI in action"
              : "Try adjusting your filters or search query"}
          </p>
          {emails.length === 0 && (
            <Button onClick={scanDemoEmails} disabled={scanning}>
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2 text-orange-600" />
                  Scan Demo Emails
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEmails.map((email) => (
            <div
              key={email.id}
              onClick={() => navigate(`/email/${email.id}`)}
              className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 hover:shadow-soft transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {getRiskBadge(email.risk_level, email.risk_score)}
                    <h3 className="font-semibold text-foreground truncate">
                      {email.subject}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    From: {email.sender} &lt;{email.sender_email}&gt;
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {email.preview}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(email.received_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
