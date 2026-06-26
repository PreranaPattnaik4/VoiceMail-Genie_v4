export interface EmailGenerationRequest {
  transcription: string;
  tone: string;
  sourceLanguage: string;
  targetLanguage: string;
  recipientName?: string;
  additionalContext?: string;
}

export interface EmailGenerationResponse {
  subject: string;
  body: string;
  intent: string;
  keyInfo: string[];
  callToAction: string;
}

export interface TranscriptionRequest {
  audioBase64: string;
  mimeType: string;
}

export interface TranscriptionResponse {
  text: string;
  detectedLanguage: string;
}

export interface TranslationRequest {
  subject: string;
  body: string;
  targetLanguage: string;
  tone: string;
}

export interface TranslationResponse {
  subject: string;
  body: string;
}

export interface DraftCreationRequest {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
}

export interface EmailTemplate {
  id: string;
  category: string;
  title: string;
  promptHint: string;
  exampleText: string;
}
