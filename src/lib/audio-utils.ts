// Audio utility functions for text-to-speech functionality

export interface VoiceSettings {
  rate: number;
  pitch: number;
  volume: number;
  voice: SpeechSynthesisVoice | null;
}

export interface TTSOptions {
  text: string;
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export class TextToSpeechManager {
  private synth: SpeechSynthesis;
  private utterance: SpeechSynthesisUtterance | null = null;
  private isPlaying = false;
  private isPaused = false;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  // Get available voices
  getVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices();
  }

  // Create and configure utterance
  createUtterance(options: TTSOptions): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(options.text);
    
    if (options.voice) {
      utterance.voice = options.voice;
    }
    
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;

    return utterance;
  }

  // Speak text with options
  speak(options: TTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isPlaying) {
        this.stop();
      }

      this.utterance = this.createUtterance(options);
      
      this.utterance.onstart = () => {
        this.isPlaying = true;
        this.isPaused = false;
      };

      this.utterance.onend = () => {
        this.isPlaying = false;
        this.isPaused = false;
        resolve();
      };

      this.utterance.onerror = (event) => {
        this.isPlaying = false;
        this.isPaused = false;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.synth.speak(this.utterance);
    });
  }

  // Pause speech
  pause(): void {
    if (this.isPlaying && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  // Resume speech
  resume(): void {
    if (this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
    }
  }

  // Stop speech
  stop(): void {
    this.synth.cancel();
    this.isPlaying = false;
    this.isPaused = false;
  }

  // Get current state
  getState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      isIdle: !this.isPlaying && !this.isPaused
    };
  }

  // Check if speech synthesis is supported
  static isSupported(): boolean {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }
}

// Convert speech to audio blob for download
export async function createAudioBlob(text: string, settings: VoiceSettings): Promise<Blob> {
  // For actual audio file generation, we'll use a more sophisticated approach
  // This is a placeholder that will work with the Web Audio API
  
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary audio context for recording
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const destination = audioContext.createMediaStreamDestination();
      const mediaRecorder = new MediaRecorder(destination.stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        resolve(blob);
      };

      // Start recording
      mediaRecorder.start();

      // Create and configure utterance for recording
      const utterance = new SpeechSynthesisUtterance(text);
      if (settings.voice) utterance.voice = settings.voice;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      utterance.onend = () => {
        // Stop recording after speech ends
        setTimeout(() => {
          mediaRecorder.stop();
          audioContext.close();
        }, 500);
      };

      utterance.onerror = () => {
        mediaRecorder.stop();
        audioContext.close();
        reject(new Error('Speech synthesis failed'));
      };

      // Speak the text
      window.speechSynthesis.speak(utterance);

    } catch (error) {
      reject(error);
    }
  });
}

// Download audio file
export function downloadAudio(blob: Blob, filename?: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `speech-${new Date().getTime()}.wav`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Format time duration
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Estimate speech duration based on text length and rate
export function estimateDuration(text: string, rate: number = 1): number {
  // Average speaking rate is about 150-160 words per minute
  const wordsPerMinute = 155 * rate;
  const wordCount = text.split(/\s+/).length;
  return (wordCount / wordsPerMinute) * 60;
}