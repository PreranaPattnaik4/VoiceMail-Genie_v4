import { EmailTemplate } from "./types";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
];

export const AVAILABLE_TONES = [
  { id: "professional", label: "Professional", icon: "Briefcase", description: "Polished and clear business tone" },
  { id: "formal", label: "Formal", icon: "Award", description: "Structured, highly respectful, and classic" },
  { id: "friendly", label: "Friendly", icon: "Smile", description: "Warm, casual, and inviting" },
  { id: "persuasive", label: "Persuasive", icon: "Sparkles", description: "Compelling and convincing" },
  { id: "apologetic", label: "Apologetic", icon: "ShieldAlert", description: "Sincere and constructive" },
  { id: "executive", label: "Executive", icon: "TrendingUp", description: "High-level, direct, and action-oriented" },
  { id: "support", label: "Customer Support", icon: "LifeBuoy", description: "Helpful, empathetic, and patient" },
];

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "biz-meeting",
    category: "Business",
    title: "Meeting Rescheduled",
    promptHint: "Ask to postpone the sync to tomorrow at 2 PM because of a conflict.",
    exampleText: "Postpone the sync meeting to tomorrow at 2 PM due to a conflict."
  },
  {
    id: "biz-status",
    category: "Business",
    title: "Project Status Update",
    promptHint: "Tell stakeholders that development phase 1 is complete and we are ready for user testing.",
    exampleText: "Phase 1 is fully complete! We are now preparing for user testing starting Friday."
  },
  {
    id: "hr-interview",
    category: "HR",
    title: "Interview Confirmation",
    promptHint: "Confirm an interview for tomorrow morning with Sarah and share the video link.",
    exampleText: "Confirm interview with Sarah for tomorrow at 10 AM. Send Google Meet link."
  },
  {
    id: "hr-onboarding",
    category: "HR",
    title: "Onboarding Welcome",
    promptHint: "Welcome David to the team, start next Monday, send details soon.",
    exampleText: "Welcome David to the engineering team. Start date is next Monday. Onboarding pack on the way."
  },
  {
    id: "sales-followup",
    category: "Sales",
    title: "Customer Follow-Up",
    promptHint: "Follow up on our proposal sent last week, ask if they have any questions.",
    exampleText: "Following up on the pricing proposal. Let me know if you want to hop on a quick call."
  },
  {
    id: "sales-outreach",
    category: "Sales",
    title: "Cold Outreach",
    promptHint: "Briefly introduce our VoiceMail Genie software to a potential retail client.",
    exampleText: "Intro VoiceMail Genie to potential client. Save 70% time drafting emails by talking."
  },
  {
    id: "support-complaint",
    category: "Customer Support",
    title: "Ticket Acknowledgment",
    promptHint: "Acknowledge their support request, we are looking into the checkout issue and will resolve in 2 hours.",
    exampleText: "Acknowledging checkout bug report. Our technical team is on it, expected fix within 2 hours."
  },
  {
    id: "support-refund",
    category: "Customer Support",
    title: "Refund Processed",
    promptHint: "Confirm that their refund has been successfully initiated and will clear in 3-5 days.",
    exampleText: "Your refund of $49 has been initiated. Should clear in your bank in 3 to 5 business days."
  }
];
