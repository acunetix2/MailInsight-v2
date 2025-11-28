import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle,
  Mail,
  Clock,
  User,
  FileText,
  Loader2,
  Link as LinkIcon,
  MessageSquare,
  Send,
  TrendingUp,
  Eye,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

interface EmailScan {
  id: string;
  subject: string;
  sender: string;
  sender_email: string;
  content_preview: string;
  received_date: string;
  risk_score: number;
  risk_level: "safe" | "suspicious" | "dangerous";
  threat_indicators: string[];
  analysis_summary: string;
  has_attachments: boolean;
}

const EmailDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState<EmailScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEmailDetail(id);
    }
  }, [id]);

  const fetchEmailDetail = async (emailId: string) => {
    try {
      const { data, error } = await supabase
        .from("email_scans")
        .select("*")
        .eq("id", emailId)
        .single();

      if (error) throw error;
      setEmail(data as EmailScan);
    } catch (error: any) {
      console.error("Error fetching email:", error);
      toast.error("Failed to load email details");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    const colors = {
      safe: "text-green-600 bg-green-500/10 border-green-500/20",
      suspicious: "text-yellow-600 bg-yellow-500/10 border-yellow-500/20",
      dangerous: "text-red-600 bg-red-500/10 border-red-500/20",
    };
    return colors[riskLevel as keyof typeof colors] || colors.safe;
  };

  const getRiskIcon = (riskLevel: string) => {
    if (riskLevel === "safe") return <CheckCircle className="h-8 w-8" />;
    return <AlertTriangle className="h-8 w-8" />;
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !email) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages([...chatMessages, { role: "user", content: userMessage }]);
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat-assistant", {
        body: {
          message: userMessage,
          emailContext: {
            subject: email.subject,
            sender: email.sender_email,
            riskLevel: email.risk_level,
            riskScore: email.risk_score,
            threatIndicators: email.threat_indicators,
            analysisSummary: email.analysis_summary,
          },
        },
      });

      if (error) throw error;

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error: any) {
      console.error("Chat error:", error);
      toast.error("Failed to get AI response");
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having trouble responding right now. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inbox
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              <span className="font-semibold text-foreground">Email Security Analysis</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Risk Score Card */}
        <Card className={`p-8 mb-8 border-2 ${getRiskColor(email.risk_level)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getRiskIcon(email.risk_level)}
              <div>
                <h2 className="text-2xl font-bold capitalize mb-1">
                  {email.risk_level} Email
                </h2>
                <p className="text-sm opacity-90">
                  Risk Score: {email.risk_score}/100
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold">{email.risk_score}</div>
              <div className="text-sm opacity-90">Threat Level</div>
            </div>
          </div>
        </Card>

        {/* Email Details */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Details
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Subject</label>
              <p className="text-foreground mt-1 font-medium">{email.subject}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <User className="h-4 w-4" />
                  From
                </label>
                <p className="text-foreground mt-1">
                  {email.sender} &lt;{email.sender_email}&gt;
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Received
                </label>
                <p className="text-foreground mt-1">
                  {new Date(email.received_date).toLocaleString()}
                </p>
              </div>
            </div>

            {email.has_attachments && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Attachments
                </label>
                <Badge variant="secondary" className="mt-1">
                  Contains Attachments
                </Badge>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Content Preview</label>
              <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                <p className="text-foreground whitespace-pre-wrap">{email.content_preview}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Threat Analysis */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Threat Analysis
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Summary</label>
              <p className="text-foreground mt-2 leading-relaxed">
                {email.analysis_summary}
              </p>
            </div>

            {email.threat_indicators && email.threat_indicators.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-3 block">
                  Threat Indicators ({email.threat_indicators.length})
                </label>
                <div className="space-y-2">
                  {email.threat_indicators.map((indicator, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground">{indicator}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Visual Threat Breakdown */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Visual Threat Breakdown
          </h3>
          
          <div className="space-y-6">
            {/* Risk Score Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Overall Risk Score</span>
                <span className="text-sm font-bold text-foreground">{email.risk_score}/100</span>
              </div>
              <Progress 
                value={email.risk_score} 
                className={`h-3 ${
                  email.risk_score > 70 ? '[&>div]:bg-red-600' : 
                  email.risk_score > 30 ? '[&>div]:bg-yellow-600' : 
                  '[&>div]:bg-green-600'
                }`}
              />
            </div>

            {/* Threat Categories */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-muted-foreground">Sender Trust</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {email.risk_score < 30 ? "High" : email.risk_score < 70 ? "Medium" : "Low"}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-muted-foreground">Link Safety</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {email.threat_indicators.some(t => t.toLowerCase().includes('link')) ? "Suspicious" : "Safe"}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-muted-foreground">Content Risk</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {email.risk_score < 30 ? "Low" : email.risk_score < 70 ? "Medium" : "High"}
                </div>
              </div>
            </div>

            {/* Threat Indicators Breakdown */}
            {email.threat_indicators && email.threat_indicators.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Detected Threats</h4>
                <div className="space-y-2">
                  {email.threat_indicators.slice(0, 5).map((indicator, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{indicator}</span>
                          <span className="text-xs font-semibold text-foreground">
                            {Math.min(100, (index + 1) * 20)}%
                          </span>
                        </div>
                        <Progress value={Math.min(100, (index + 1) * 20)} className="h-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* AI Chat Assistant */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            AI Security Assistant
          </h3>
          
          <div className="space-y-4">
            {/* Chat Messages */}
            <div className="min-h-[200px] max-h-[400px] overflow-y-auto space-y-3 p-4 bg-muted/30 rounded-lg">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">Ask me anything about this email</p>
                  <p className="text-xs text-muted-foreground">
                    Try: "Why is this email dangerous?" or "What should I do?"
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border p-3 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Ask about this email's security..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit();
                  }
                }}
                className="min-h-[60px] resize-none"
                disabled={chatLoading}
              />
              <Button
                onClick={handleChatSubmit}
                disabled={!chatInput.trim() || chatLoading}
                size="icon"
                className="h-[60px] w-[60px]"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Recommended Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Recommended Actions
          </h3>
          <div className="space-y-3">
            {email.risk_level === "dangerous" && (
              <>
                <div className="flex items-center gap-3 text-red-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>Delete this email immediately</span>
                </div>
                <div className="flex items-center gap-3 text-red-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>Report as phishing to your email provider</span>
                </div>
                <div className="flex items-center gap-3 text-red-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>Do not click any links or open attachments</span>
                </div>
              </>
            )}
            {email.risk_level === "suspicious" && (
              <>
                <div className="flex items-center gap-3 text-yellow-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>Exercise caution with this email</span>
                </div>
                <div className="flex items-center gap-3 text-yellow-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>Verify sender identity through alternate channels</span>
                </div>
                <div className="flex items-center gap-3 text-yellow-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>Avoid clicking links or downloading attachments</span>
                </div>
              </>
            )}
            {email.risk_level === "safe" && (
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>This email appears safe based on our analysis</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EmailDetail;
