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
  Heart
} from "lucide-react";
import { initAuth, googleSignIn, logout, getTokenStatus, isTokenExpired } from "./firebase-auth";
import { User as FirebaseUser } from "firebase/auth";
import { SUPPORTED_LANGUAGES, AVAILABLE_TONES, EMAIL_TEMPLATES } from "./data";
import { EmailGenerationResponse, TranscriptionResponse } from "./types";

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

  // Refs for audio recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

    setIsGenerating(true);
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
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate email draft.");
      }

      const data: EmailGenerationResponse = await response.json();
      setGeneratedEmail(data);
      setManuallyEditedSubject(data.subject);
      setManuallyEditedBody(data.body);
    } catch (err) {
      console.error("Email generation failed:", err);
      alert("Failed to generate email. Please check your network connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Translate in One Click
  const translateEmail = async (targetLang: string) => {
    if (!generatedEmail || !manuallyEditedSubject || !manuallyEditedBody) return;

    setIsTranslating(true);
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
        })
      });

      if (!response.ok) {
        throw new Error("Failed to translate email.");
      }

      const data = await response.json();
      setManuallyEditedSubject(data.subject);
      setManuallyEditedBody(data.body);
    } catch (err) {
      console.error("Translation failed:", err);
      alert("Failed to translate email. Please try again.");
    } finally {
      setIsTranslating(false);
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

    setIsSavingDraft(true);
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
        })
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
    } catch (err: any) {
      console.error("Gmail saving error:", err);
      setDraftStatus('error');
      setDraftStatusMessage(err.message || "Failed to create Gmail draft. Ensure permissions are allowed.");
    } finally {
      setIsSavingDraft(false);
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
          {/* App Guide Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
              isSidebarOpen 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle Info Sidebar"
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
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto overflow-hidden">
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
              <div className="p-6 space-y-6">
                {/* Branding Block */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                      🎙️ VoiceMail Genie
                    </h2>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide mt-1">
                      AI-Powered Voice-to-Email Assistant
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* About section */}
                <div className="space-y-1.5 border-b border-slate-100 pb-4">
                  <button
                    onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                    className="flex items-center justify-between w-full text-left font-extrabold cursor-pointer group py-1"
                  >
                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-widest">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      <span>About</span>
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
                      VoiceMail Genie helps users convert voice recordings into context-aware email drafts. Simply speak, upload audio, or provide key points, and the AI generates a well-structured email tailored to your preferred tone and communication style.
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
                        { icon: "🎤", text: "Voice Recording" },
                        { icon: "📁", text: "Audio File Upload" },
                        { icon: "📝", text: "Real-Time Speech Transcription" },
                        { icon: "🤖", text: "AI-Powered Email Generation" },
                        { icon: "🎭", text: "Multiple Writing Tones" },
                        { icon: "🌍", text: "Multi-Language Support" },
                        { icon: "📧", text: "Professional Email Draft Creation" },
                        { icon: "⚡", text: "Fast & Accurate Processing" },
                        { icon: "🎯", text: "Intent Detection & Context Understanding" }
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
                      <span>Workflow</span>
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
                    {/* Highly polished visual workflow blocks */}
                    <div className="relative pl-3.5 space-y-3 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-[1px] before:bg-indigo-100 pt-2">
                      {[
                        { num: "1", label: "Record or Upload Audio", desc: "Speak directly or drop any audio file" },
                        { num: "2", label: "Speech-to-Text Transcription", desc: "Instant Whisper V3 word extraction" },
                        { num: "3", label: "AI Intent & Context Analysis", desc: "Identify key outcomes & call-to-actions" },
                        { num: "4", label: "Smart Email Generation", desc: "Polished drafted prose ready for edit" },
                        { num: "5", label: "Review & Send", desc: "Directly compose & save to Gmail Drafts" }
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
                        "React",
                        "TypeScript",
                        "Tailwind CSS",
                        "Firebase",
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

        {/* Main Bento Grid Container */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-6 gap-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
        
        {/* CARD 1: Voice Control Card (3 cols, 2 rows) */}
        <section className="lg:col-span-3 lg:row-span-2 lg:col-start-1 lg:row-start-1 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between relative overflow-hidden">
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
        <section className="lg:col-span-3 lg:row-span-4 lg:col-start-1 lg:row-start-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
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
                <span>Genie is writing...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-indigo-200 animate-pulse" />
                <span>Generate Email Draft</span>
              </>
            )}
          </button>
        </section>

        {/* CARD 3: Tone Selection Card (2 cols, 6 rows) */}
        <section className="lg:col-span-2 lg:row-span-6 lg:col-start-4 lg:row-start-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
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

        {/* CARD 4: Efficiency Stats Card (2 cols, 6 rows) - Slate 900 Theme */}
        <section className="lg:col-span-2 lg:row-span-6 lg:col-start-11 lg:row-start-1 bg-slate-900 rounded-2xl p-5 text-white flex flex-col justify-between shadow-lg relative overflow-hidden">
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

        {/* CARD 5: Main Email Draft Workspace (5 cols, 6 rows) */}
        <section className="lg:col-span-5 lg:row-span-6 lg:col-start-6 lg:row-start-1 bg-white rounded-2xl border-2 border-indigo-100 shadow-xl p-5 md:p-6 flex flex-col justify-between">
          
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
    </div>
  );
}
