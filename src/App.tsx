import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Square,
  Pause,
  Play,
  Upload,
  CheckCircle,
  RefreshCw,
  Globe,
  Sparkles,
  Mail,
  LogOut,
  User,
  Copy,
  Check,
  Briefcase,
  Award,
  Smile,
  FileText,
  ChevronRight,
  Info,
  ShieldAlert,
  TrendingUp,
  LifeBuoy,
  Loader2,
  Trash2,
  FileAudio,
  BookOpen,
  X,
  Cpu,
  Layers,
  Heart,
  Search,
  Plus,
  FolderPlus,
  Edit,
  Bookmark,
  Archive
} from "lucide-react";
import { initAuth, googleSignIn, logout, getTokenStatus, isTokenExpired } from "./firebase-auth";
import { User as FirebaseUser } from "firebase/auth";
import { SUPPORTED_LANGUAGES, AVAILABLE_TONES, EMAIL_TEMPLATES } from "./data";
import { EmailGenerationResponse, TranscriptionResponse, SavedDraft, TemplateScenario } from "./types";

const TEMPLATE_SCENARIOS: TemplateScenario[] = [
  {
    id: "proj-update",
    category: "Project Updates",
    title: "Project Milestone",
    description: "Update stakeholders on a key milestone achieved.",
    fields: [
      { key: "recipientName", label: "Recipient Name", placeholder: "e.g., Sarah Smith", type: "text" },
      { key: "projectName", label: "Project Name", placeholder: "e.g., VoiceMail Genie v2", type: "text" },
      { key: "status", label: "Current Status", placeholder: "e.g., Phase 1 testing complete", type: "text" },
      { key: "nextSteps", label: "Next Steps", placeholder: "e.g., Start Phase 2 on Friday", type: "textarea" },
      { key: "deadline", label: "Upcoming Deadline", placeholder: "e.g., Launch on July 15", type: "text" }
    ]
  },
  {
    id: "proj-delay",
    category: "Project Updates",
    title: "Delay Notice",
    description: "Inform the team or client of a delay in the schedule.",
    fields: [
      { key: "recipientName", label: "Recipient Name", placeholder: "e.g., Alice", type: "text" },
      { key: "projectName", label: "Project Name", placeholder: "e.g., Website Redesign", type: "text" },
      { key: "reason", label: "Reason for Delay", placeholder: "e.g., unexpected API changes", type: "textarea" },
      { key: "newTimeline", label: "New Estimated Timeline", placeholder: "e.g., delayed by 1 week, ready June 30th", type: "text" }
    ]
  },
  {
    id: "prof-perf",
    category: "Professional",
    title: "Performance Review Feedback",
    description: "Share feedback from a performance review session.",
    fields: [
      { key: "recipientName", label: "Employee Name", placeholder: "e.g., Mark Benson", type: "text" },
      { key: "strengths", label: "Key Strengths", placeholder: "e.g., strong problem-solving and reliability", type: "textarea" },
      { key: "growth", label: "Areas of Growth", placeholder: "e.g., public speaking, presenting results", type: "textarea" },
      { key: "nextMeeting", label: "Next Follow-Up Meeting", placeholder: "e.g., next month", type: "text" }
    ]
  },
  {
    id: "biz-partner",
    category: "Business",
    title: "Partnership Proposal",
    description: "Propose a collaborative partnership with another business.",
    fields: [
      { key: "recipientName", label: "Partner Lead", placeholder: "e.g., John Doe", type: "text" },
      { key: "companyName", label: "Partner Company", placeholder: "e.g., Stripe Inc.", type: "text" },
      { key: "collaborationArea", label: "Area of Collaboration", placeholder: "e.g., co-marketing webinar", type: "text" },
      { key: "valueProposition", label: "Value Proposition", placeholder: "e.g., double lead conversion rates", type: "textarea" }
    ]
  },
  {
    id: "sales-follow",
    category: "Sales",
    title: "Post-Proposal Follow-Up",
    description: "Follow up with a potential customer on a previously sent sales proposal.",
    fields: [
      { key: "recipientName", label: "Client Name", placeholder: "e.g., Robert", type: "text" },
      { key: "productName", label: "Product / Service", placeholder: "e.g., Premium SaaS Subscription", type: "text" },
      { key: "lastDiscussion", label: "Last Discussion Date", placeholder: "e.g., Monday last week", type: "text" },
      { key: "offerValidity", label: "Offer Validity/Action", placeholder: "e.g., Free setup if booked this week", type: "text" }
    ]
  },
  {
    id: "hr-offer",
    category: "HR",
    title: "Job Offer",
    description: "Extend a formal job offer to a successful candidate.",
    fields: [
      { key: "recipientName", label: "Candidate Name", placeholder: "e.g., Emily Chen", type: "text" },
      { key: "roleTitle", label: "Role Title", placeholder: "e.g., Senior Full-Stack Engineer", type: "text" },
      { key: "salary", label: "Salary Details", placeholder: "e.g., $120,000 annually", type: "text" },
      { key: "startDate", label: "Start Date", placeholder: "e.g., July 1st, 2026", type: "text" }
    ]
  },
  {
    id: "support-ack",
    category: "Customer Support",
    title: "Support Ticket Acknowledgment",
    description: "Acknowledge a support ticket receipt and set expectations.",
    fields: [
      { key: "recipientName", label: "Customer Name", placeholder: "e.g., Alex Johnson", type: "text" },
      { key: "issueSummary", label: "Reported Issue", placeholder: "e.g., Checkout page is showing 500 error", type: "text" },
      { key: "resolutionTime", label: "Expected Fix Time", placeholder: "e.g., within 2 hours", type: "text" }
    ]
  },
  {
    id: "meeting-agenda",
    category: "Meetings",
    title: "Agenda & Setup",
    description: "Schedule a sync meeting with a prepared agenda.",
    fields: [
      { key: "recipientName", label: "Attendees", placeholder: "e.g., Marketing Team", type: "text" },
      { key: "meetingTopic", label: "Meeting Topic", placeholder: "e.g., Q3 Strategy Planning", type: "text" },
      { key: "dateTime", label: "Date & Time", placeholder: "e.g., Tomorrow at 10 AM EST", type: "text" },
      { key: "agendaPoints", label: "Key Agenda Points", placeholder: "e.g., 1. Review performance, 2. Budget allocation", type: "textarea" }
    ]
  },
  {
    id: "meeting-postpone",
    category: "Meetings",
    title: "Postpone Sync Meeting",
    description: "Politely reschedule a meeting due to a conflict.",
    fields: [
      { key: "recipientName", label: "Recipient Name", placeholder: "e.g., Jason", type: "text" },
      { key: "meetingName", label: "Meeting Name", placeholder: "e.g., Weekly Sync", type: "text" },
      { key: "newTime", label: "Proposed New Time", placeholder: "e.g., Thursday at 4:00 PM", type: "text" },
      { key: "reason", label: "Reason for Reschedule", placeholder: "e.g., client call emergency", type: "text" }
    ]
  },
  {
    id: "followup-catchup",
    category: "Follow-Ups",
    title: "No-Response Catch-up",
    description: "Politely check back after a lead or colleague hasn't responded.",
    fields: [
      { key: "recipientName", label: "Contact Name", placeholder: "e.g., Mark", type: "text" },
      { key: "originalSubject", label: "Original Topic", placeholder: "e.g., Partnering on integration", type: "text" }
    ]
  },
  {
    id: "greetings-anniversary",
    category: "Greetings & Wishes",
    title: "Work Anniversary Wish",
    description: "Congratulate a team member on their work anniversary.",
    fields: [
      { key: "recipientName", label: "Team Member Name", placeholder: "e.g., David Williams", type: "text" },
      { key: "yearsCount", label: "Years of Service", placeholder: "e.g., 3 years", type: "text" },
      { key: "keyContribution", label: "Highlighted Contribution", placeholder: "e.g., launching the mobile app rewrite", type: "textarea" }
    ]
  }
];

export default function App() {
  // App Guide / Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(typeof window !== "undefined" ? window.innerWidth > 1024 : true);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(false);
  const [isWorkflowExpanded, setIsWorkflowExpanded] = useState(false);
  const [isPoweredByExpanded, setIsPoweredByExpanded] = useState(false);

  // Authentication state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [authStatus, setAuthStatus] = useState<'connected' | 'expired' | 'disconnected'>('disconnected');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Audio Capture & Upload State
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Processing States
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Cancel and AbortController State
  const [activeOperation, setActiveOperation] = useState<'generation' | 'translation' | 'gmail_save' | 'rewrite' | 'tone_conversion' | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Email Configuration State
  const [transcription, setTranscription] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [selectedTone, setSelectedTone] = useState("professional");
  const [sourceLanguage, setSourceLanguage] = useState("Auto Detect");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [recipientName, setRecipientName] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  // AI Output State
  const [generatedEmail, setGeneratedEmail] = useState<EmailGenerationResponse | null>(null);
  const [manuallyEditedSubject, setManuallyEditedSubject] = useState("");
  const [manuallyEditedBody, setManuallyEditedBody] = useState("");

  // Feedback states
  const [copyStatus, setCopyStatus] = useState<'idle' | 'subject' | 'body' | 'full'>('idle');
  const [draftStatus, setDraftStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [draftStatusMessage, setDraftStatusMessage] = useState("");

  // Creation Workspace Modes
  const [activeTab, setActiveTab] = useState<'voice' | 'template' | 'compose'>('voice');

  // Template Mode State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [favoriteTemplates, setFavoriteTemplates] = useState<string[]>(["proj-update", "sales-follow"]);
  const [recentTemplates, setRecentTemplates] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("proj-update");
  const [templateFieldValues, setTemplateFieldValues] = useState<Record<string, string>>({});

  // Compose Mode State
  const [composeInput, setComposeInput] = useState("");

  // My Library State
  const [sidebarTab, setSidebarTab] = useState<'guide' | 'library'>('library');
  const [selectedLibraryCategory, setSelectedLibraryCategory] = useState("All");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ oldName: string; newName: string } | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [savingToCategory, setSavingToCategory] = useState<string>("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  const [customCategories, setCustomCategories] = useState<string[]>([
    "Client Emails",
    "Team Updates",
    "Personal Messages",
    "Family Messages",
    "Job Applications"
  ]);

  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([
    {
      id: "draft-1",
      subject: "Phase 1 Testing Complete",
      body: "<p>Hi Team,</p><p>I am pleased to inform you that Phase 1 testing is now fully complete! We have resolved the major blockers and are ready to proceed. Phase 2 starts this Friday.</p><p>Best regards,<br>Project Lead</p>",
      category: "Team Updates",
      savedAt: "June 26, 2026",
      isFavorite: true
    },
    {
      id: "draft-2",
      subject: "Welcome Emily Chen to the Team!",
      body: "<p>Hi everyone,</p><p>Please join me in giving a warm welcome to Emily Chen, who is joining us as our new Senior Full-Stack Engineer starting this Monday!</p><p>Best,<br>HR Team</p>",
      category: "Team Updates",
      savedAt: "June 25, 2026",
      isFavorite: false
    }
  ]);

  // Refs for audio recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Toast effect
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const cancelActiveOperation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const completedOp = activeOperation;
    
    // Clear all loading states
    setIsGenerating(false);
    setIsTranslating(false);
    setIsSavingDraft(false);
    setActiveOperation(null);
    setShowCancelModal(false);

    // Show cancellation success notification
    let opName = "Email generation";
    if (completedOp === "translation") opName = "Translation";
    if (completedOp === "gmail_save") opName = "Gmail draft saving";
    if (completedOp === "rewrite") opName = "AI rewrite";
    if (completedOp === "tone_conversion") opName = "AI tone conversion";

    showToast(`${opName} cancelled successfully.`, 'info');
  };

  // Initialize Firebase Auth
  useEffect(() => {
    const s = getTokenStatus();
    setAuthStatus(s.status);
    setNeedsAuth(s.status !== 'connected');

    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        const currentS = getTokenStatus();
        setAuthStatus(currentS.status);
        setNeedsAuth(currentS.status !== 'connected');
      },
      (failStatus) => {
        setUser(null);
        setAccessToken(null);
        setAuthStatus(failStatus || 'disconnected');
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Periodically check if token expired
  useEffect(() => {
    const checkExpiration = () => {
      const s = getTokenStatus();
      setAuthStatus(s.status);
      setNeedsAuth(s.status !== 'connected');
    };
    const interval = setInterval(checkExpiration, 10000); // Check every 10 seconds
    window.addEventListener("focus", checkExpiration); // Check when user switches back to tab
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkExpiration);
    };
  }, []);

  // Timer for audio recording duration
  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recordingState]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setDraftStatus('idle');
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setAuthStatus('connected');
        setNeedsAuth(false);
        // Show success message briefly
        setDraftStatus('success');
        setDraftStatusMessage("Gmail connected successfully");
        setTimeout(() => {
          setDraftStatus('idle');
          setDraftStatusMessage("");
        }, 4000);
      }
    } catch (err: any) {
      console.error("Authentication failed:", err);
      setDraftStatus('error');
      setDraftStatusMessage(err.message || "Authentication failed. Reconnect Gmail.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setAuthStatus('disconnected');
      setNeedsAuth(true);
      setDraftStatus('idle');
      setDraftStatusMessage("");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Audio Recording Flow
  const startRecording = async () => {
    try {
      setUploadedFileName(null);
      setAudioUrl(null);
      audioChunksRef.current = [];
      setRecordingDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
        
        // Auto-transcribe
        transcribeBlob(audioBlob);
      };

      recorder.start(250);
      setRecordingState('recording');
    } catch (err: any) {
      console.error("Microphone capture failure:", err);
      alert("Unable to open microphone. Please allow microphone permissions and try again.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState !== 'idle') {
      mediaRecorderRef.current.stop();
      setRecordingState('idle');
    }
  };

  // Audio Upload Flow
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("Please upload a smaller audio file (under 15MB) for processing.");
      return;
    }

    setUploadedFileName(file.name);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    transcribeBlob(file);
  };

  // Drag and Drop support
  const [isDragActive, setIsDragActive] = useState(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('audio/')) {
        alert("Please drop a valid audio file.");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        alert("Please upload a smaller audio file (under 15MB) for processing.");
        return;
      }
      setUploadedFileName(file.name);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);

      transcribeBlob(file);
    }
  };

  // Clear current audio
  const clearAudio = () => {
    setAudioUrl(null);
    setUploadedFileName(null);
    setTranscription("");
    setDetectedLanguage("");
    setGeneratedEmail(null);
    setManuallyEditedSubject("");
    setManuallyEditedBody("");
    setDraftStatus('idle');
  };

  // Call API to transcribe audio blob
  const transcribeBlob = async (blob: Blob) => {
    setIsTranscribing(true);
    setTranscription("");
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64: base64Data,
              mimeType: blob.type || "audio/webm"
            })
          });

          if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
          }

          const data: TranscriptionResponse = await response.json();
          setTranscription(data.text);
          if (data.detectedLanguage) {
            setDetectedLanguage(data.detectedLanguage);
            // Autofill source language if possible
            const matchedLang = SUPPORTED_LANGUAGES.find(
              l => data.detectedLanguage.toLowerCase().includes(l.name.toLowerCase())
            );
            if (matchedLang) {
              setSourceLanguage(matchedLang.name);
            }
          }
        } catch (err: any) {
          console.error("Transcription processing failed:", err);
          alert("We couldn't transcribe the audio. Please speak clearly or try a different file.");
        } finally {
          setIsTranscribing(false);
        }
      };
    } catch (err) {
      console.error("Blob reading failed:", err);
      setIsTranscribing(false);
    }
  };

  // Convert Transcript to Professional structured Email using Gemini
  const generateEmail = async () => {
    if (!transcription.trim()) {
      alert("Please record or write a transcription first before generating an email.");
      return;
    }

    if (isGenerating) return; // Prevent duplicate requests

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setActiveOperation('generation');
    setGeneratedEmail(null);
    setDraftStatus('idle');

    try {
      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcription,
          tone: selectedTone,
          sourceLanguage,
          targetLanguage,
          recipientName,
          additionalContext
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("Failed to generate email draft.");
      }

      const data: EmailGenerationResponse = await response.json();
      setGeneratedEmail(data);
      setManuallyEditedSubject(data.subject);
      setManuallyEditedBody(data.body);
      showToast("Email generation completed successfully!", 'success');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Email generation aborted.");
        return;
      }
      console.error("Email generation failed:", err);
      alert("Failed to generate email. Please check your network connection and try again.");
    } finally {
      setIsGenerating(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setActiveOperation(null);
      }
    }
  };

  // Handle Translate in One Click
  const translateEmail = async (targetLang: string) => {
    if (!generatedEmail || !manuallyEditedSubject || !manuallyEditedBody) return;
    if (isTranslating) return; // Prevent duplicate requests

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsTranslating(true);
    setActiveOperation('translation');
    setTargetLanguage(targetLang);

    try {
      const response = await fetch("/api/translate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: manuallyEditedSubject,
          body: manuallyEditedBody,
          targetLanguage: targetLang,
          tone: selectedTone
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("Failed to translate email.");
      }

      const data = await response.json();
      setManuallyEditedSubject(data.subject);
      setManuallyEditedBody(data.body);
      showToast("Email translation completed successfully!", 'success');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Translation aborted.");
        return;
      }
      console.error("Translation failed:", err);
      alert("Failed to translate email. Please try again.");
    } finally {
      setIsTranslating(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setActiveOperation(null);
      }
    }
  };

  // Save to Gmail Drafts Flow
  const saveToGmailDraft = async () => {
    const currentStatus = getTokenStatus();
    if (currentStatus.status === 'disconnected') {
      setDraftStatus('error');
      setDraftStatusMessage("Gmail disconnected. Please connect Gmail first.");
      setNeedsAuth(true);
      setAuthStatus('disconnected');
      return;
    }

    if (isSavingDraft) return; // Prevent duplicate requests

    let activeToken = accessToken;
    if (currentStatus.status === 'expired' || isTokenExpired()) {
      console.log("Token is expired. Attempting automatic refresh...");
      try {
        setDraftStatus('idle');
        setDraftStatusMessage("Refreshing Gmail authentication...");
        const result = await googleSignIn();
        if (result) {
          setUser(result.user);
          setAccessToken(result.accessToken);
          activeToken = result.accessToken;
          setAuthStatus('connected');
          setNeedsAuth(false);
        } else {
          throw new Error("Could not automatically refresh token.");
        }
      } catch (err: any) {
        console.error("Auto refresh failed, forcing re-authentication:", err);
        setDraftStatus('error');
        setDraftStatusMessage("Authentication expired. Please click Reconnect Gmail.");
        setNeedsAuth(true);
        setAuthStatus('expired');
        setAccessToken(null);
        return;
      }
    }

    if (!activeToken) {
      setDraftStatus('error');
      setDraftStatusMessage("Gmail disconnected. Please connect Gmail.");
      setNeedsAuth(true);
      setAuthStatus('disconnected');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSavingDraft(true);
    setActiveOperation('gmail_save');
    setDraftStatus('idle');

    try {
      const response = await fetch("/api/gmail/create-draft", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          accessToken: activeToken,
          to: recipientEmail,
          subject: manuallyEditedSubject,
          body: manuallyEditedBody
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 401 || errData.error?.includes("invalid credentials") || errData.error?.includes("401") || errData.error?.includes("Unauthorized")) {
          setAccessToken(null);
          setAuthStatus('expired');
          setNeedsAuth(true);
          throw new Error("Authentication expired. Please click Reconnect Gmail.");
        }
        throw new Error(errData.error || "Gmail API draft saving failed");
      }

      setDraftStatus('success');
      setDraftStatusMessage("Email successfully saved to your Gmail Drafts!");
      showToast("Draft saved to Gmail successfully!", 'success');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Gmail save aborted.");
        return;
      }
      console.error("Gmail saving error:", err);
      setDraftStatus('error');
      setDraftStatusMessage(err.message || "Failed to create Gmail draft. Ensure permissions are allowed.");
    } finally {
      setIsSavingDraft(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setActiveOperation(null);
      }
    }
  };

  // Apply a preset template
  const applyTemplate = (hint: string) => {
    setTranscription(hint);
    setGeneratedEmail(null);
  };

  // Copy helpers
  const handleCopy = (text: string, type: 'subject' | 'body' | 'full') => {
    navigator.clipboard.writeText(text);
    setCopyStatus(type);
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const getFullDraftText = () => {
    // Strip HTML tags for clean copy
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = manuallyEditedBody;
    const plainBody = tempDiv.textContent || tempDiv.innerText || "";
    return `Subject: ${manuallyEditedSubject}\n\n${plainBody}`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle new versatile AI Actions
  const handleAIAction = async (action: string, customOptions?: Record<string, any>) => {
    if (isGenerating) return; // Prevent duplicate requests

    let textToProcess = "";
    if (action === 'compose') {
      textToProcess = composeInput;
    } else if (action === 'template') {
      textToProcess = ""; // template fields are passed in customOptions
    } else {
      textToProcess = manuallyEditedBody || transcription || composeInput;
    }

    if (action === 'compose' && !composeInput.trim()) {
      alert("Please describe what you want to communicate first.");
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setDraftStatus('idle');

    // Determine specific operation type
    let currentOp: 'generation' | 'rewrite' | 'tone_conversion' = 'generation';
    if (action === 'template' || action === 'compose') {
      currentOp = 'generation';
    } else if (action.startsWith('tone_')) {
      currentOp = 'tone_conversion';
    } else {
      currentOp = 'rewrite';
    }
    setActiveOperation(currentOp);

    try {
      const response = await fetch("/api/ai-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text: textToProcess,
          tone: selectedTone,
          targetLanguage,
          additionalContext,
          ...customOptions
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("Failed to execute AI action.");
      }

      const data: EmailGenerationResponse = await response.json();
      setGeneratedEmail(data);
      setManuallyEditedSubject(data.subject);
      setManuallyEditedBody(data.body);

      // Record recent template usage if applicable
      if (action === 'template' && customOptions?.templateId) {
        setRecentTemplates(prev => {
          const filtered = prev.filter(id => id !== customOptions.templateId);
          return [customOptions.templateId, ...filtered].slice(0, 5);
        });
      }

      // Success toast
      let successMsg = "AI action completed successfully!";
      if (currentOp === 'generation') successMsg = "Email draft generated successfully!";
      if (currentOp === 'rewrite') successMsg = "Email draft rewritten successfully!";
      if (currentOp === 'tone_conversion') successMsg = "Email tone converted successfully!";
      showToast(successMsg, 'success');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("AI action aborted.");
        return;
      }
      console.error("AI action failed:", err);
      alert("Failed to generate or modify email. Please try again.");
    } finally {
      setIsGenerating(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setActiveOperation(null);
      }
    }
  };

  // Custom Category Library Handlers
  const addCategory = (name: string) => {
    if (!name.trim()) return;
    if (customCategories.includes(name.trim())) {
      alert("This category folder already exists.");
      return;
    }
    setCustomCategories(prev => [...prev, name.trim()]);
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const renameCategory = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName.trim()) return;
    if (customCategories.includes(newName.trim())) {
      alert("A category with this name already exists.");
      return;
    }
    setCustomCategories(prev => prev.map(c => c === oldName ? newName.trim() : c));
    setSavedDrafts(prev => prev.map(d => d.category === oldName ? { ...d, category: newName.trim() } : d));
    setEditingCategory(null);
  };

  const deleteCategory = (categoryName: string) => {
    if (confirm(`Are you sure you want to delete the folder "${categoryName}"? Saved emails in this folder will be uncategorized.`)) {
      setCustomCategories(prev => prev.filter(c => c !== categoryName));
      setSavedDrafts(prev => prev.map(d => d.category === categoryName ? { ...d, category: "Uncategorized" } : d));
    }
  };

  const saveDraftToLibrary = (category: string) => {
    if (!manuallyEditedSubject && !manuallyEditedBody) {
      alert("There is no active generated email to save.");
      return;
    }
    const newDraft: SavedDraft = {
      id: "saved-" + Date.now(),
      subject: manuallyEditedSubject || "(No Subject)",
      body: manuallyEditedBody || "",
      category: category || "Uncategorized",
      savedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isFavorite: false
    };
    setSavedDrafts(prev => [newDraft, ...prev]);
    setShowSaveModal(false);
    
    // Show quick status feedback
    setDraftStatus('success');
    setDraftStatusMessage(`Saved to "${category}"!`);
    setTimeout(() => {
      setDraftStatus('idle');
      setDraftStatusMessage("");
    }, 3000);
  };

  const toggleFavoriteDraft = (id: string) => {
    setSavedDrafts(prev => prev.map(d => d.id === id ? { ...d, isFavorite: !d.isFavorite } : d));
  };

  const deleteSavedDraft = (id: string) => {
    if (confirm("Are you sure you want to delete this saved email?")) {
      setSavedDrafts(prev => prev.filter(d => d.id !== id));
    }
  };

  const renderToneIcon = (iconName: string) => {
    switch (iconName) {
      case "Briefcase": return <Briefcase className="h-4 w-4" />;
      case "Award": return <Award className="h-4 w-4" />;
      case "Smile": return <Smile className="h-4 w-4" />;
      case "Sparkles": return <Sparkles className="h-4 w-4" />;
      case "ShieldAlert": return <ShieldAlert className="h-4 w-4" />;
      case "TrendingUp": return <TrendingUp className="h-4 w-4" />;
      case "LifeBuoy": return <LifeBuoy className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans antialiased flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="h-16 px-6 md:px-8 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-2.5 text-indigo-600 font-bold text-lg md:text-xl tracking-tight">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-100">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <span>VoiceMail-Genie</span>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {/* My Library Toggle */}
          <button
            onClick={() => {
              if (isSidebarOpen && sidebarTab === 'library') {
                setIsSidebarOpen(false);
              } else {
                setIsSidebarOpen(true);
                setSidebarTab('library');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
              isSidebarOpen && sidebarTab === 'library'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle My Library"
          >
            <Bookmark className="w-4 h-4" />
            <span>My Library</span>
          </button>

          {/* App Guide Toggle */}
          <button
            onClick={() => {
              if (isSidebarOpen && sidebarTab === 'guide') {
                setIsSidebarOpen(false);
              } else {
                setIsSidebarOpen(true);
                setSidebarTab('guide');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
              isSidebarOpen && sidebarTab === 'guide'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle App Guide"
          >
            <BookOpen className="w-4 h-4" />
            <span>App Guide</span>
          </button>

          {/* Active Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-100">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span>AI Engine: Active</span>
          </div>

          {/* Authentication State */}
          <div>
            {needsAuth ? (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="relative flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-xl bg-white text-slate-700 hover:text-indigo-600 font-bold text-xs shadow-sm hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer"
                id="google-signin-btn"
              >
                {isLoggingIn ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>{isLoggingIn ? "Connecting..." : "Connect Gmail"}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 pl-2 pr-1.5 py-1 rounded-xl">
                <div className="flex items-center gap-1.5">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || "User"} className="h-6 w-6 rounded-full border border-white shadow-sm" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <span className="hidden md:inline text-xs font-bold text-slate-700 truncate max-w-[100px]">
                    {user?.displayName?.split(" ")[0]}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
                  title="Disconnect Account"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* App Body Wrapper with Sidebar & Bento Grid */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-none overflow-hidden">
        {/* App Guide Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "20rem" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-4rem)] relative z-20"
            >
              <div className="p-6 space-y-5 flex flex-col h-full overflow-hidden">
                {/* Branding Block */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                      🎙️ VoiceMail Genie
                    </h2>
                    <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide mt-0.5">
                      AI-Powered Email Workspace
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sidebar Navigation Tabs */}
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                  <button
                    onClick={() => setSidebarTab('library')}
                    className={`flex-1 py-1.5 px-2.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      sidebarTab === 'library'
                        ? 'bg-white text-slate-800 shadow-xs border-b border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>My Library</span>
                  </button>
                  <button
                    onClick={() => setSidebarTab('guide')}
                    className={`flex-1 py-1.5 px-2.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      sidebarTab === 'guide'
                        ? 'bg-white text-slate-800 shadow-xs border-b border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Guide</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-5 scrollbar-thin">
                  {/* Tab 1: App Guide */}
                  {sidebarTab === 'guide' && (
                    <div className="space-y-5">
                      {/* About section */}
                      <div className="space-y-1.5 border-b border-slate-100 pb-4">
                        <button
                          onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                          className="flex items-center justify-between w-full text-left font-extrabold cursor-pointer group py-1"
                        >
                          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-widest">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                            <span>About Workspace</span>
                          </div>
                          <ChevronRight 
                            className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                              isAboutExpanded ? "rotate-90" : ""
                            }`} 
                          />
                        </button>
                        
                        <motion.div
                          initial={false}
                          animate={{ height: isAboutExpanded ? "auto" : 0, opacity: isAboutExpanded ? 1 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="text-xs text-slate-600 leading-relaxed pt-1">
                            VoiceMail Genie is an AI email workspace with 3 creation workflows: Voice Mode, Scenario Templates, and AI Manual Compose. Convert voice context, custom fields, or rough notes into highly-polished email drafts, edit them directly, or sync with your Gmail Drafts folder.
                          </p>
                        </motion.div>
                      </div>

                      {/* Key Features section */}
                      <div className="space-y-2.5 border-b border-slate-100 pb-4">
                        <button
                          onClick={() => setIsFeaturesExpanded(!isFeaturesExpanded)}
                          className="flex items-center justify-between w-full text-left font-extrabold cursor-pointer group py-1"
                        >
                          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-widest">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Key Features</span>
                          </div>
                          <ChevronRight 
                            className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                              isFeaturesExpanded ? "rotate-90" : ""
                            }`} 
                          />
                        </button>

                        <motion.div
                          initial={false}
                          animate={{ height: isFeaturesExpanded ? "auto" : 0, opacity: isFeaturesExpanded ? 1 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <ul className="space-y-2 pt-1">
                            {[
                              { icon: "🎤", text: "Voice Recording & File Upload" },
                              { icon: "📋", text: "Scenario Template Fields" },
                              { icon: "✍️", text: "AI Compose Manual Drafts" },
                              { icon: "🗄️", text: "My Library with Custom Folders" },
                              { icon: "🤖", text: "AI Assistant Quick Actions" },
                              { icon: "🎭", text: "7 Custom Writing Tones" },
                              { icon: "🌍", text: "Multi-Language Output Translation" },
                              { icon: "📧", text: "One-click Gmail Draft Syncing" }
                            ].map((feat, index) => (
                              <li key={index} className="flex items-start gap-2 text-[11px] text-slate-600">
                                <span className="shrink-0 text-xs">{feat.icon}</span>
                                <span className="font-semibold">{feat.text}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      </div>

                      {/* Workflow section */}
                      <div className="space-y-2.5 border-b border-slate-100 pb-4">
                        <button
                          onClick={() => setIsWorkflowExpanded(!isWorkflowExpanded)}
                          className="flex items-center justify-between w-full text-left font-extrabold cursor-pointer group py-1"
                        >
                          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-widest">
                            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Workflows</span>
                          </div>
                          <ChevronRight 
                            className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                              isWorkflowExpanded ? "rotate-90" : ""
                            }`} 
                          />
                        </button>

                        <motion.div
                          initial={false}
                          animate={{ height: isWorkflowExpanded ? "auto" : 0, opacity: isWorkflowExpanded ? 1 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="relative pl-3.5 space-y-3 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-[1px] before:bg-indigo-100 pt-2">
                            {[
                              { num: "1", label: "Speak, Fill, or Write", desc: "Select Voice, Template, or Compose mode" },
                              { num: "2", label: "Customize Tone & Lang", desc: "Choose your persona and output language" },
                              { num: "3", label: "AI Drafting & Actions", desc: "Let Gemini build the subject and body" },
                              { num: "4", label: "Gmail Draft Sync", desc: "Save directly in your personal Gmail folder" },
                              { num: "5", label: "Organize in Library", desc: "Keep drafts stored in custom folders" }
                            ].map((step, idx) => (
                              <div key={idx} className="relative space-y-0.5">
                                <div className="absolute -left-[18px] top-0.5 w-2 h-2 rounded-full bg-indigo-600 ring-4 ring-white flex items-center justify-center"></div>
                                <h4 className="text-[10px] font-extrabold text-slate-800 leading-none">{step.label}</h4>
                                <p className="text-[9px] text-slate-400 leading-tight">{step.desc}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      </div>

                      {/* Powered By section */}
                      <div className="space-y-2">
                        <button
                          onClick={() => setIsPoweredByExpanded(!isPoweredByExpanded)}
                          className="flex items-center justify-between w-full text-left font-extrabold cursor-pointer group py-1"
                        >
                          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-widest">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                            <span>Powered By</span>
                          </div>
                          <ChevronRight 
                            className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                              isPoweredByExpanded ? "rotate-90" : ""
                            }`} 
                          />
                        </button>

                        <motion.div
                          initial={false}
                          animate={{ height: isPoweredByExpanded ? "auto" : 0, opacity: isPoweredByExpanded ? 1 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-wrap gap-1 pt-1">
                            {[
                              "Gemini AI",
                              "Whisper Speech Recognition",
                              "React 18",
                              "TypeScript",
                              "Tailwind CSS",
                              "Firebase Auth",
                              "Google AI Studio"
                            ].map((tech, idx) => (
                              <span 
                                key={idx} 
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-slate-200/60 rounded text-[9px] font-bold text-slate-600"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: My Library */}
                  {sidebarTab === 'library' && (
                    <div className="space-y-5">
                      {/* Folders & Custom Categories */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Library Folders</span>
                          <button
                            onClick={() => setIsAddingCategory(true)}
                            className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                          >
                            <FolderPlus className="w-3.5 h-3.5" /> Add Folder
                          </button>
                        </div>

                        {/* Add Category inline form */}
                        {isAddingCategory && (
                          <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <input
                              type="text"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              placeholder="New folder name..."
                              className="flex-1 text-[11px] p-1 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') addCategory(newCategoryName);
                                if (e.key === 'Escape') setIsAddingCategory(false);
                              }}
                            />
                            <button
                              onClick={() => addCategory(newCategoryName)}
                              className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setIsAddingCategory(false)}
                              className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Custom Categories Folder List */}
                        <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                          <div
                            onClick={() => setSelectedLibraryCategory("All")}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                              selectedLibraryCategory === "All"
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold shadow-xs'
                                : 'bg-slate-50/50 border-transparent hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">📁 <span>All Saved Drafts</span></span>
                            <span className="text-[10px] bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-500 font-bold">{savedDrafts.length}</span>
                          </div>

                          {customCategories.map((cat) => {
                            const isSelected = selectedLibraryCategory === cat;
                            const count = savedDrafts.filter(d => d.category === cat).length;
                            return (
                              <div
                                key={cat}
                                className={`group flex items-center justify-between p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold shadow-xs'
                                    : 'bg-slate-50/50 border-transparent hover:bg-slate-100 text-slate-600'
                                }`}
                              >
                                {editingCategory?.oldName === cat ? (
                                  <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      value={editingCategory.newName}
                                      onChange={(e) => setEditingCategory({ ...editingCategory, newName: e.target.value })}
                                      className="flex-1 text-[11px] p-0.5 bg-white border border-slate-200 rounded font-semibold focus:outline-none"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') renameCategory(cat, editingCategory.newName);
                                        if (e.key === 'Escape') setEditingCategory(null);
                                      }}
                                    />
                                    <button
                                      onClick={() => renameCategory(cat, editingCategory.newName)}
                                      className="p-0.5 bg-indigo-600 text-white rounded cursor-pointer"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span onClick={() => setSelectedLibraryCategory(cat)} className="flex items-center gap-1.5 truncate flex-grow">
                                      📁 <span>{cat}</span>
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-[9px] bg-slate-200/50 px-1.5 py-0.5 rounded text-slate-500 font-bold group-hover:hidden">
                                        {count}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingCategory({ oldName: cat, newName: cat });
                                        }}
                                        className="p-0.5 hover:text-indigo-600 hover:bg-slate-200 rounded hidden group-hover:inline-block cursor-pointer"
                                        title="Rename Folder"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteCategory(cat);
                                        }}
                                        className="p-0.5 hover:text-rose-600 hover:bg-slate-200 rounded hidden group-hover:inline-block cursor-pointer"
                                        title="Delete Folder"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Saved Draft List */}
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 block">Saved Emails ({selectedLibraryCategory === 'All' ? 'All' : selectedLibraryCategory})</span>
                        
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {savedDrafts.filter(d => selectedLibraryCategory === "All" || d.category === selectedLibraryCategory).length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4 text-slate-400 text-xs">
                              <p className="font-semibold text-slate-500">No emails here</p>
                              <p className="text-[10px] text-slate-400 mt-1 leading-normal">Generate an email, click "Save to Library" inside the review card, and choose a folder.</p>
                            </div>
                          ) : (
                            savedDrafts
                              .filter(d => selectedLibraryCategory === "All" || d.category === selectedLibraryCategory)
                              .map((draft) => (
                                <div
                                  key={draft.id}
                                  onClick={() => {
                                    // Click to load draft into Draft workspace
                                    setGeneratedEmail({
                                      subject: draft.subject,
                                      body: draft.body,
                                      intent: "Loaded Saved Draft",
                                      keyInfo: [`Category: ${draft.category}`],
                                      callToAction: "Customize or Sync Draft to Gmail"
                                    });
                                    setManuallyEditedSubject(draft.subject);
                                    setManuallyEditedBody(draft.body);
                                  }}
                                  className="group relative bg-slate-50/70 hover:bg-indigo-50/40 hover:border-indigo-100 p-2.5 rounded-xl border border-slate-200/60 transition-all cursor-pointer text-left space-y-1.5"
                                >
                                  <div className="flex justify-between items-start gap-1">
                                    <h4 className="text-xs font-bold text-slate-700 truncate flex-grow group-hover:text-indigo-700">
                                      {draft.subject}
                                    </h4>
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleFavoriteDraft(draft.id);
                                        }}
                                        className="p-0.5 text-slate-400 hover:text-amber-500 rounded cursor-pointer"
                                        title="Favorite"
                                      >
                                        <Heart className={`w-3.5 h-3.5 ${draft.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteSavedDraft(draft.id);
                                        }}
                                        className="p-0.5 text-slate-400 hover:text-rose-600 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        title="Delete Saved Draft"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: draft.body }} />

                                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 pt-1">
                                    <span className="bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-600">
                                      📁 {draft.category}
                                    </span>
                                    <span>{draft.savedAt}</span>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Footer with Attribution */}
              <div className="p-5 bg-slate-50 border-t border-slate-100">
                <div className="text-[9px] text-slate-400 font-medium flex items-center justify-center gap-1">
                  <Heart className="w-2.5 h-2.5 text-indigo-500 fill-indigo-500 animate-pulse" />
                  <span>Gemini AI • Whisper • Firebase</span>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-grow flex flex-col min-w-0 bg-[#F1F5F9]">
          {/* Mode Navigation Tabs */}
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/40">
              <button
                onClick={() => setActiveTab('voice')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'voice'
                    ? 'bg-white text-slate-800 shadow-sm border-b border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>🎤 Voice Mode</span>
              </button>
              <button
                onClick={() => setActiveTab('template')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'template'
                    ? 'bg-white text-slate-800 shadow-sm border-b border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>📋 Template Mode</span>
              </button>
              <button
                onClick={() => setActiveTab('compose')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'compose'
                    ? 'bg-white text-slate-800 shadow-sm border-b border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>✍️ Compose Mode</span>
              </button>
            </div>

            {/* Quick Helper Text */}
            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              {activeTab === 'voice' && "Speak or upload audio context to draft"}
              {activeTab === 'template' && "Select scenario & fill parameters to draft"}
              {activeTab === 'compose' && "Outline rough content & use AI assistant"}
            </div>
          </div>

          {/* Main Bento Grid Container */}
          <main className="flex-1 p-0 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-6 gap-0 overflow-y-auto max-h-[calc(100vh-7.5rem)]">

            {/* CONDITIONAL INPUT WORKFLOW (Columns 1-3) */}
            {activeTab === 'voice' && (
              <>
                {/* CARD 1: Voice Control Card (3 cols, 2 rows) */}
                <section className="lg:col-span-3 lg:row-span-2 lg:col-start-1 lg:row-start-1 bg-white border border-slate-200/80 p-5 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Voice Input</span>
                    <span className={`text-xs font-mono font-bold ${recordingState === 'recording' ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>
                      {formatDuration(recordingDuration)} / 02:00
                    </span>
                  </div>

                  {/* Interactive State Body */}
                  <div className="flex flex-col items-center justify-center my-3 relative">
                    {!audioUrl && recordingState === 'idle' && (
                      <div className="flex flex-col items-center gap-3">
                        <button
                          onClick={startRecording}
                          className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center ring-4 ring-indigo-100 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                          title="Start Recording"
                        >
                          <Mic className="w-6 h-6 animate-pulse" />
                        </button>
                        <div className="text-center">
                          <p className="text-xs font-semibold text-slate-700">Click to start speaking</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Or drop audio file</p>
                        </div>
                        
                        <button
                          onClick={triggerFileUpload}
                          className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Upload className="w-3 h-3" /> Upload File
                        </button>
                      </div>
                    )}

                    {recordingState !== 'idle' && (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center ring-4 ring-red-100 shadow-lg animate-pulse">
                          <div className="w-3.5 h-3.5 bg-white rounded-xs"></div>
                        </div>
                        <p className="text-xs font-bold text-red-500 animate-pulse uppercase tracking-wider">
                          {recordingState === 'recording' ? 'Recording Context...' : 'Recording Paused'}
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          {recordingState === 'recording' ? (
                            <button
                              onClick={pauseRecording}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                              title="Pause"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={resumeRecording}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all cursor-pointer"
                              title="Resume"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={stopRecording}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                          >
                            <Square className="w-3 h-3 fill-white" /> Stop
                          </button>
                        </div>
                      </div>
                    )}

                    {audioUrl && recordingState === 'idle' && (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                          {uploadedFileName ? <FileAudio className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[160px] block">
                          {uploadedFileName || "Voice Note Recording"}
                        </span>
                        
                        <audio src={audioUrl} controls className="w-full h-8 max-w-[180px] mt-1" />

                        <div className="flex items-center gap-2 justify-center mt-1">
                          <button
                            onClick={clearAudio}
                            className="text-[10px] uppercase tracking-wider font-bold text-rose-500 hover:text-rose-600"
                          >
                            Clear
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            onClick={triggerFileUpload}
                            className="text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-indigo-600"
                          >
                            Re-upload
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Hidden Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="audio/*"
                      className="hidden"
                    />
                  </div>

                  {/* Sound wave visual bar matching design HTML */}
                  <div className="flex justify-center gap-1 mt-2">
                    <div className={`w-1 rounded-full transition-all duration-300 ${recordingState === 'recording' ? 'h-6 bg-red-400 animate-pulse' : 'h-4 bg-slate-200'}`}></div>
                    <div className={`w-1 rounded-full transition-all duration-300 ${recordingState === 'recording' ? 'h-10 bg-indigo-400 animate-pulse' : 'h-6 bg-indigo-200'}`}></div>
                    <div className={`w-1 rounded-full transition-all duration-300 ${recordingState === 'recording' ? 'h-12 bg-indigo-600 animate-pulse' : 'h-10 bg-indigo-600'}`}></div>
                    <div className={`w-1 rounded-full transition-all duration-300 ${recordingState === 'recording' ? 'h-8 bg-indigo-400 animate-pulse' : 'h-8 bg-indigo-400'}`}></div>
                    <div className={`w-1 rounded-full transition-all duration-300 ${recordingState === 'recording' ? 'h-4 bg-red-300 animate-pulse' : 'h-4 bg-slate-200'}`}></div>
                  </div>

                  {/* Drag and Drop Active Overlay */}
                  {isDragActive && (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className="absolute inset-0 bg-indigo-600/95 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 transition-all z-10"
                    >
                      <Upload className="h-10 w-10 animate-bounce" />
                      <p className="font-bold text-sm mt-2">Drop audio file here</p>
                      <p className="text-[10px] text-indigo-100">Transcribe instantly</p>
                    </div>
                  )}
                </section>

                {/* CARD 2: Real-time Transcription Workspace (3 cols, 4 rows) */}
                <section className="lg:col-span-3 lg:row-span-4 lg:col-start-1 lg:row-start-3 bg-white border border-slate-200/80 p-5 flex flex-col justify-between">
                  <header className="flex justify-between items-center mb-3">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Transcription</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] rounded font-bold uppercase tracking-wider">
                      WHISPER V3
                    </span>
                  </header>

                  <div className="relative flex-1 flex flex-col min-h-[160px]">
                    <textarea
                      value={transcription}
                      onChange={(e) => setTranscription(e.target.value)}
                      placeholder="Speak using the Voice Input, select a template scenario below, or type your message outline directly..."
                      className="w-full flex-1 p-3 text-xs md:text-sm text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder-slate-400 resize-none font-sans leading-relaxed"
                    />
                    
                    {isTranscribing && (
                      <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex items-center justify-center rounded-xl">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-xl shadow-xs">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                          <span className="text-[11px] font-semibold text-slate-600 animate-pulse">Whispering text...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preset Scenario Tray inside card */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-2">Preset Scenarios</span>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x max-w-full">
                      {EMAIL_TEMPLATES.map(template => (
                        <button
                          key={template.id}
                          onClick={() => applyTemplate(template.exampleText)}
                          className={`flex-shrink-0 snap-start text-left p-2 rounded-xl border transition-all text-[11px] max-w-[130px] cursor-pointer ${
                            transcription === template.exampleText
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold shadow-xs'
                              : 'bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-600'
                          }`}
                          title={template.promptHint}
                        >
                          <p className="font-bold truncate text-slate-800">{template.title}</p>
                          <p className="text-[9px] text-slate-400 truncate mt-0.5">{template.category}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* High-fidelity primary Generate Button */}
                  <button
                    onClick={generateEmail}
                    disabled={isTranscribing || isGenerating || !transcription.trim()}
                    className="w-full mt-3 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none transition-all cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-200" />
                        <span>Generating Email...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-indigo-200 animate-pulse" />
                        <span>Generate Email Draft</span>
                      </>
                    )}
                  </button>

                  {/* Stop Generation Button */}
                  {isGenerating && activeOperation === 'generation' && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="w-full mt-2 py-2 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Square className="h-3 w-3 fill-red-600 text-red-600" />
                      <span>Stop Generation</span>
                    </button>
                  )}
                </section>
              </>
            )}

            {activeTab === 'template' && (
              <>
                {/* CARD 1: Template Category Selector & Library (3 cols, 3 rows) */}
                <section className="lg:col-span-3 lg:row-span-3 lg:col-start-1 lg:row-start-1 bg-white border border-slate-200/80 p-5 flex flex-col justify-between overflow-hidden">
                  <div className="space-y-4 h-full flex flex-col">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Scenario Library</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-[9px] font-bold rounded text-slate-500 uppercase">
                        {TEMPLATE_SCENARIOS.length} templates
                      </span>
                    </div>

                    {/* Search Field */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search email scenarios..."
                        className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold"
                      />
                    </div>

                    {/* Horizontal Categories Filter */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full">
                      {["All", "Professional", "Business", "Sales", "HR", "Customer Support", "Project Updates", "Meetings", "Follow-Ups", "Greetings & Wishes"].map(cat => {
                        const isSelected = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`flex-shrink-0 py-1 px-2.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    {/* Template list with scroll */}
                    <div className="flex-grow overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                      {TEMPLATE_SCENARIOS.filter(s => {
                        const matchesCat = selectedCategory === "All" || s.category === selectedCategory;
                        const matchesQuery = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            s.description.toLowerCase().includes(searchQuery.toLowerCase());
                        return matchesCat && matchesQuery;
                      }).length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-[11px]">
                          No scenarios match search terms.
                        </div>
                      ) : (
                        TEMPLATE_SCENARIOS.filter(s => {
                          const matchesCat = selectedCategory === "All" || s.category === selectedCategory;
                          const matchesQuery = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                              s.description.toLowerCase().includes(searchQuery.toLowerCase());
                          return matchesCat && matchesQuery;
                        }).map(scenario => {
                          const isSelected = selectedTemplateId === scenario.id;
                          const isFav = favoriteTemplates.includes(scenario.id);
                          const isRecent = recentTemplates.includes(scenario.id);

                          return (
                            <div
                              key={scenario.id}
                              onClick={() => {
                                setSelectedTemplateId(scenario.id);
                                // Prepopulate field values if empty
                                const initialFields: Record<string, string> = {};
                                scenario.fields.forEach(f => {
                                  initialFields[f.key] = templateFieldValues[f.key] || "";
                                });
                                setTemplateFieldValues(initialFields);
                              }}
                              className={`group flex items-start justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-200 shadow-xs'
                                  : 'bg-slate-50/50 border-transparent hover:border-slate-200/80'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-800' : 'text-slate-800'}`}>
                                    {scenario.title}
                                  </h4>
                                  {isRecent && (
                                    <span className="bg-slate-200 text-slate-500 text-[8px] px-1 rounded font-extrabold uppercase scale-90">Recent</span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">{scenario.description}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFavoriteTemplates(prev =>
                                    prev.includes(scenario.id)
                                      ? prev.filter(id => id !== scenario.id)
                                      : [...prev, scenario.id]
                                  );
                                }}
                                className="p-0.5 text-slate-300 hover:text-amber-500 rounded flex-shrink-0 cursor-pointer"
                              >
                                <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-500' : ''}`} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </section>

                {/* CARD 2: Template Field Value Builder (3 cols, 3 rows) */}
                <section className="lg:col-span-3 lg:row-span-3 lg:col-start-1 lg:row-start-4 bg-white border border-slate-200/80 p-5 flex flex-col justify-between overflow-hidden">
                  {(() => {
                    const scenario = TEMPLATE_SCENARIOS.find(s => s.id === selectedTemplateId) || TEMPLATE_SCENARIOS[0];
                    return (
                      <div className="flex flex-col h-full justify-between">
                        <div className="space-y-3">
                          <div>
                            <div className="text-[10px] uppercase tracking-widest font-extrabold text-indigo-600">Active Scenario Form</div>
                            <h3 className="text-sm font-extrabold text-slate-800 mt-0.5">{scenario.title}</h3>
                            <p className="text-[10px] text-slate-400 leading-normal mt-0.5">{scenario.description}</p>
                          </div>

                          {/* Dynamic fields map */}
                          <div className="space-y-3 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                            {scenario.fields.map(f => (
                              <div key={f.key} className="space-y-1">
                                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wide block">
                                  {f.label}
                                </label>
                                {f.type === 'textarea' ? (
                                  <textarea
                                    value={templateFieldValues[f.key] || ""}
                                    onChange={(e) => setTemplateFieldValues({
                                      ...templateFieldValues,
                                      [f.key]: e.target.value
                                    })}
                                    placeholder={f.placeholder}
                                    rows={2}
                                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold resize-none"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={templateFieldValues[f.key] || ""}
                                    onChange={(e) => setTemplateFieldValues({
                                      ...templateFieldValues,
                                      [f.key]: e.target.value
                                    })}
                                    placeholder={f.placeholder}
                                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Generate Draft Button */}
                        <button
                          onClick={() => handleAIAction('template', {
                            templateId: scenario.id,
                            templateTitle: scenario.title,
                            fields: templateFieldValues
                          })}
                          disabled={isGenerating || scenario.fields.some(f => !templateFieldValues[f.key]?.trim())}
                          className="w-full mt-3 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none transition-all cursor-pointer"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-200" />
                              <span>Generating Email...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 text-indigo-200 animate-pulse" />
                              <span>Generate Template Email</span>
                            </>
                          )}
                        </button>

                        {/* Stop Generation Button */}
                        {isGenerating && activeOperation === 'generation' && (
                          <button
                            onClick={() => setShowCancelModal(true)}
                            className="w-full mt-2 py-2 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Square className="h-3 w-3 fill-red-600 text-red-600" />
                            <span>Stop Generation</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </section>
              </>
            )}

            {activeTab === 'compose' && (
              <>
                {/* CARD 1 & 2 combined: Manual + AI Compose Workspace (3 cols, 6 rows) */}
                <section className="lg:col-span-3 lg:row-span-6 lg:col-start-1 lg:row-start-1 bg-white border border-slate-200/80 p-5 flex flex-col justify-between overflow-hidden">
                  <div className="flex-grow flex flex-col h-full justify-between space-y-4">
                    <div className="flex-grow flex flex-col space-y-3 min-h-[160px]">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block">AI Manual Compose</span>
                        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mt-1">Write Outline & Command AI</h3>
                      </div>

                      {/* Text editor area */}
                      <div className="flex-1 relative flex flex-col">
                        <textarea
                          value={composeInput}
                          onChange={(e) => setComposeInput(e.target.value)}
                          placeholder="Describe what you want to communicate and let AI create the email..."
                          className="w-full flex-1 p-3.5 text-xs md:text-sm text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder-slate-400 resize-none font-sans leading-relaxed"
                        />
                        {isGenerating && (
                          <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3 rounded-xl">
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-xl shadow-xs">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                              <span className="text-[11px] font-semibold text-slate-600 animate-pulse">
                                {activeOperation === 'generation' && "Generating Email..."}
                                {activeOperation === 'rewrite' && "Rewriting..."}
                                {activeOperation === 'tone_conversion' && "Converting Tone..."}
                                {!activeOperation && "AI is working..."}
                              </span>
                            </div>
                            <button
                              onClick={() => setShowCancelModal(true)}
                              className="py-1.5 px-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            >
                              <Square className="h-3 h-3 fill-red-600 text-red-600" />
                              <span>Stop Generation</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Actions Panel Grid (Quick Assistant) */}
                    <div className="pt-3 border-t border-slate-100 space-y-2 flex-shrink-0">
                      <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-wider block">AI Assistant Quick Actions</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => handleAIAction('compose')}
                          disabled={!composeInput.trim() || isGenerating}
                          className="py-1.5 px-2 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 shadow-sm disabled:bg-slate-100 disabled:text-slate-400 transition-all cursor-pointer"
                          title="Generate Email from Scratch"
                        >
                          ✨ Generate Email
                        </button>
                        <button
                          onClick={() => handleAIAction('improve')}
                          disabled={isGenerating}
                          className="py-1.5 px-2 text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/50 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                          title="Improve Quality and Elegance"
                        >
                          ✨ Improve Writing
                        </button>
                        <button
                          onClick={() => handleAIAction('tone_professional')}
                          disabled={isGenerating}
                          className="py-1.5 px-2 text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/50 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          💼 Professional
                        </button>
                        <button
                          onClick={() => handleAIAction('tone_friendly')}
                          disabled={isGenerating}
                          className="py-1.5 px-2 text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/50 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          😊 Friendly Tone
                        </button>
                        <button
                          onClick={() => handleAIAction('tone_formal')}
                          disabled={isGenerating}
                          className="py-1.5 px-2 text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/50 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          Formal Tone
                        </button>
                        <button
                          onClick={() => handleAIAction('summarize')}
                          disabled={isGenerating}
                          className="py-1.5 px-2 text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/50 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          📝 Summarize
                        </button>
                        <button
                          onClick={() => handleAIAction('expand')}
                          disabled={isGenerating}
                          className="py-1.5 px-2 text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/50 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          📈 Expand
                        </button>
                        <button
                          onClick={() => handleAIAction('grammar')}
                          disabled={isGenerating}
                          className="py-1.5 px-2 text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/50 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          ✍️ Fix Grammar
                        </button>
                        <button
                          onClick={() => handleAIAction('subject')}
                          disabled={isGenerating}
                          className="py-1.5 px-2 text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/50 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          ✨ Gen Subject
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

        {/* CARD 3: Tone Selection Card (2 cols, 6 rows) */}
        <section className="lg:col-span-2 lg:row-span-6 lg:col-start-4 lg:row-start-1 bg-white border border-slate-200/80 p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-2">Select Tone</span>
            <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
              {AVAILABLE_TONES.map(tone => {
                const isSelected = selectedTone === tone.id;
                return (
                  <div
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.id)}
                    className={`flex items-center justify-between p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                        : 'bg-slate-50/50 border-transparent hover:bg-slate-100 text-slate-600 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={isSelected ? 'text-indigo-600' : 'text-slate-400'}>
                        {renderToneIcon(tone.icon)}
                      </span>
                      <span className="text-[11px]">{tone.label}</span>
                    </div>
                    {isSelected && <div className="w-1 h-1 bg-indigo-600 rounded-full"></div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
            {/* Output Language select */}
            <div>
              <div className="text-[9px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Output Language</div>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full text-[11px] bg-slate-50 border border-slate-200 p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-slate-700"
              >
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.name}>{l.flag} {l.name}</option>
                ))}
              </select>
            </div>

            {/* Recipients metadata inputs */}
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">To Name</span>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Sarah"
                  className="w-full text-[11px] p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-300"
                />
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Extra Context</span>
                <input
                  type="text"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="e.g. postpone"
                  className="w-full text-[11px] p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-300"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CARD 4: Efficiency Stats Card (3 cols, 6 rows) - Slate 900 Theme */}
        <section className="lg:col-span-3 lg:row-span-6 lg:col-start-10 lg:row-start-1 bg-slate-900 border-l border-slate-800 p-5 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Ambient Glow effect */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Efficiency Insights</span>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[8px] rounded-full font-extrabold uppercase tracking-widest">Live Metrics</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Saved Time</span>
                <div className="text-3xl font-extrabold tracking-tight text-white font-mono flex items-baseline gap-0.5">
                  {manuallyEditedBody ? `0:${Math.max(12, Math.round(manuallyEditedBody.split(" ").length * 0.45)).toString().padStart(2, '0')}` : "0:00"}
                  <span className="text-xs text-indigo-400 font-sans font-bold">sec</span>
                </div>
                <span className="text-[9px] text-slate-500 block leading-tight">drafting acceleration</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">AI Accuracy</span>
                <div className="text-3xl font-extrabold tracking-tight text-indigo-400 font-mono">
                  {manuallyEditedBody ? "98%" : "100%"}
                </div>
                <span className="text-[9px] text-slate-500 block leading-tight">context precision</span>
              </div>
            </div>

            {/* Premium Visual: Comparison Bar Graph */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3 space-y-2.5">
              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                <span>SPEED BENCHMARK</span>
                <span className="text-indigo-400">20x FASTER</span>
              </div>
              
              <div className="space-y-2">
                {/* Manual Method */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>Manual Typing</span>
                    <span className="font-mono">~300s</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500/80 rounded-full w-[85%]"></div>
                  </div>
                </div>

                {/* VoiceMail Genie Method */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-indigo-300 font-bold">
                    <span>VoiceMail Genie</span>
                    <span className="font-mono">~15s</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "8%" }}
                      transition={{ duration: 1 }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                    ></motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {/* Extracted Details & Intent */}
            <div className="bg-white/5 rounded-xl p-3 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase">DETECTOR INTENT</span>
                <span className="px-1.5 py-0.5 bg-indigo-500/10 text-[9px] text-indigo-300 font-extrabold uppercase font-mono rounded tracking-wider">
                  {generatedEmail?.intent || "AWAITING AUDIO"}
                </span>
              </div>
              
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500" 
                  style={{ width: generatedEmail ? '100%' : '0%' }}
                ></div>
              </div>

              {generatedEmail?.keyInfo && generatedEmail.keyInfo.length > 0 ? (
                <div className="pt-1.5 border-t border-white/5 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">EXTRACTED ENTITIES:</span>
                  <div className="max-h-[70px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                    {generatedEmail.keyInfo.map((info, idx) => (
                      <p key={idx} className="text-[10px] text-slate-300 flex items-start gap-1.5">
                        <span className="w-1 h-1 bg-emerald-400 rounded-full mt-1 flex-shrink-0"></span>
                        <span className="leading-tight">{info}</span>
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[9px] text-slate-500 text-center py-1 italic">
                  Key details will appear here upon transcription
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CARD 5: Main Email Draft Workspace (4 cols, 6 rows) */}
        <section className="lg:col-span-4 lg:row-span-6 lg:col-start-6 lg:row-start-1 bg-white border-l border-r border-slate-200/80 p-5 md:p-6 flex flex-col justify-between">
          
          {generatedEmail ? (
            <div className="flex-1 flex flex-col justify-between h-full space-y-4">
              
              {/* Draft Header */}
              <header className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-inner">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Review & Polish</div>
                  <input
                    type="text"
                    value={manuallyEditedSubject}
                    onChange={(e) => setManuallyEditedSubject(e.target.value)}
                    className="w-full text-base font-bold text-slate-800 border-none focus:ring-0 p-0 placeholder-slate-300 truncate focus:outline-none focus:border-none mt-0.5"
                    placeholder="Email Subject Line"
                  />
                </div>

                {/* Instant Translator Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 flex-shrink-0">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={targetLanguage}
                    onChange={(e) => translateEmail(e.target.value)}
                    disabled={isTranslating}
                    className="text-[10px] font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0 cursor-pointer focus:outline-none"
                  >
                    <option value="">Translate...</option>
                    {SUPPORTED_LANGUAGES.map(l => (
                      <option key={l.code} value={l.name}>{l.flag} {l.name}</option>
                    ))}
                  </select>
                  {isTranslating && <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />}
                  {isTranslating && (
                    <button
                      onClick={() => {
                        setActiveOperation('translation');
                        setShowCancelModal(true);
                      }}
                      className="ml-1 px-1.5 py-0.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[9px] rounded border border-red-100 cursor-pointer flex items-center gap-0.5"
                      title="Stop Translation"
                    >
                      <Square className="w-1.5 h-1.5 fill-red-600 text-red-600" />
                      <span>Stop</span>
                    </button>
                  )}
                </div>
              </header>

              {/* Draft HTML Code Editor / TextArea */}
              <div className="flex-1 flex flex-col bg-slate-50/50 rounded-xl p-4 border border-slate-100 min-h-[220px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email Body (HTML format)</span>
                  <button
                    onClick={() => handleCopy(manuallyEditedBody, 'body')}
                    className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    {copyStatus === 'body' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied HTML
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy HTML
                      </>
                    )}
                  </button>
                </div>
                
                <textarea
                  value={manuallyEditedBody}
                  onChange={(e) => setManuallyEditedBody(e.target.value)}
                  className="w-full flex-grow p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs md:text-sm text-slate-800 transition-all resize-none font-sans leading-relaxed"
                  placeholder="Type or edit email body draft here..."
                />
              </div>

              {/* Account Sync module */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Mail className="h-3 w-3" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Gmail Draft Sync</span>
                  </div>
                  
                  {/* Status Indicator */}
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    authStatus === 'connected' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : authStatus === 'expired'
                      ? 'bg-amber-50 text-amber-700 border border-amber-100'
                      : 'bg-slate-50 text-slate-500 border border-slate-200'
                  }`}>
                    {authStatus === 'connected' && "Gmail connected successfully"}
                    {authStatus === 'expired' && "Authentication expired"}
                    {authStatus === 'disconnected' && "Gmail disconnected"}
                  </span>
                </div>

                {authStatus !== 'connected' ? (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-left">
                    <div className="text-left flex-grow">
                      <p className="text-[11px] text-slate-700 font-bold">
                        {authStatus === 'expired' ? "Authentication expired" : "Gmail disconnected"}
                      </p>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        {authStatus === 'expired' 
                          ? "Your authentication session has expired. Please reconnect to refresh." 
                          : "Authorize Gmail to save drafts directly in your drafts folder."}
                      </p>
                    </div>
                    <button
                      onClick={handleLogin}
                      disabled={isLoggingIn}
                      className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                    >
                      {isLoggingIn ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-indigo-200" />}
                      {authStatus === 'expired' ? "Reconnect Gmail" : "Connect Gmail"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row gap-2 items-end">
                      <div className="flex-grow space-y-1 w-full">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">To: Recipient Email Address</span>
                        <input
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="sarah.jones@acme.com"
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400"
                        />
                      </div>
                      
                      <button
                        onClick={saveToGmailDraft}
                        disabled={isSavingDraft}
                        className="w-full sm:w-auto py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer h-[32px] flex-shrink-0"
                      >
                        {isSavingDraft ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 text-indigo-200" />
                            <span>Save to Gmail Drafts</span>
                          </>
                        )}
                      </button>

                      {isSavingDraft && (
                        <button
                          onClick={() => {
                            setActiveOperation('gmail_save');
                            setShowCancelModal(true);
                          }}
                          className="w-full sm:w-auto py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-lg border border-red-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer h-[32px] flex-shrink-0"
                        >
                          <Square className="h-3 h-3 fill-red-600 text-red-600" />
                          <span>Stop Saving</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        Gmail connected successfully
                      </span>
                      <button 
                        onClick={handleLogout}
                        className="text-slate-400 hover:text-rose-600 font-semibold cursor-pointer"
                      >
                        Disconnect Account
                      </button>
                    </div>

                    {draftStatus !== 'idle' && (
                      <div className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                        draftStatus === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' : 'bg-rose-50 border border-rose-100 text-rose-800'
                      }`}>
                        {draftStatus === 'success' ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> : <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />}
                        <span>{draftStatusMessage}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Draft controls footer */}
              <footer className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(manuallyEditedSubject, 'subject')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 bg-white cursor-pointer transition-all"
                  >
                    Copy Subject
                  </button>
                  <button
                    onClick={() => handleCopy(getFullDraftText(), 'full')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 bg-white cursor-pointer transition-all flex items-center gap-1"
                  >
                    {copyStatus === 'full' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>Copy Full Plain-Text</span>
                  </button>
                </div>

                {/* Direct quick regeneration */}
                <div className="flex gap-1 items-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1">Regen:</span>
                  {AVAILABLE_TONES.slice(0, 3).map(tone => (
                    <button
                      key={tone.id}
                      onClick={() => {
                        setSelectedTone(tone.id);
                        setTimeout(() => generateEmail(), 50);
                      }}
                      className={`py-1 px-2 rounded-lg border text-[9px] font-bold transition-all cursor-pointer ${
                        selectedTone === tone.id
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              </footer>

            </div>
          ) : (
            // Empty / Initial state
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-8 space-y-4 min-h-[400px]">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                <Mail className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Draft Review Workspace</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
                  Your AI-crafted email draft will appear here. Capture your voice with the Voice Input engine on the left, or apply a scenario template to get started instantly.
                </p>
              </div>
              <div className="w-full max-w-md p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-left text-[11px] text-slate-600">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  <span>Step 1: Speak into microphone or upload audio file on the left.</span>
                </div>
                <div className="flex items-center gap-2 text-left text-[11px] text-slate-600">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  <span>Step 2: Review or customize transcription text in the workspace.</span>
                </div>
                <div className="flex items-center gap-2 text-left text-[11px] text-slate-600">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  <span>Step 3: Pick style details and click Generate Email Draft!</span>
                </div>
              </div>
            </div>
          )}

        </section>

      </main>

      </div>
      </div>

      {/* Footer Info bar */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-6 space-y-2">
          <p>© 2026 VoiceMail Genie. Built with Antigravity Server & Google Gemini 3.5 Flash.</p>
          <p className="flex items-center justify-center gap-1 text-[11px]">
            <Info className="h-3.5 w-3.5 text-slate-300" />
            Voice recordings are transcribed privately. Gmail composition occurs through secure official Google API channels with permission.
          </p>
        </div>
      </footer>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 max-w-md w-full relative overflow-hidden"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-base font-extrabold text-slate-800">
                    {activeOperation === 'generation' && "Cancel Email Generation?"}
                    {activeOperation === 'translation' && "Cancel Email Translation?"}
                    {activeOperation === 'gmail_save' && "Cancel Gmail Draft Save?"}
                    {activeOperation === 'rewrite' && "Cancel AI Rewrite?"}
                    {activeOperation === 'tone_conversion' && "Cancel AI Tone Conversion?"}
                    {!activeOperation && "Cancel Active AI Process?"}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {activeOperation === 'generation' && "The AI is currently generating your email draft. Are you sure you want to stop the process?"}
                    {activeOperation === 'translation' && "The AI is currently translating your email draft. Are you sure you want to stop the process?"}
                    {activeOperation === 'gmail_save' && "The system is currently saving your email draft to Gmail. Are you sure you want to stop the process?"}
                    {activeOperation === 'rewrite' && "The AI is currently rewriting your email. Are you sure you want to stop the process?"}
                    {activeOperation === 'tone_conversion' && "The AI is currently converting the tone of your email. Are you sure you want to stop the process?"}
                    {!activeOperation && "An AI action is currently in progress. Are you sure you want to stop the process?"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 border border-slate-200/60 bg-white cursor-pointer transition-all"
                >
                  Continue Generating
                </button>
                <button
                  onClick={cancelActiveOperation}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all shadow-md shadow-red-100"
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border bg-white text-slate-800 border-slate-200/80 max-w-sm"
          >
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
            {toast.type === 'error' && <ShieldAlert className="h-5 w-5 text-rose-500 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-indigo-500 flex-shrink-0" />}
            <span className="text-xs font-semibold leading-normal">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
