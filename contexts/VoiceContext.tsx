import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

type VoiceCommand = {
  patterns: string[];
  action: () => void | Promise<void>;
  description: string;
};

type VoiceState = {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  lastCommand: string;
  error: string | null;
};



// Rork Toolkit STT URL
const STT_API_URL = 'https://toolkit.rork.com/stt/transcribe/';

let recognition: any = null;
let recognitionInitialized = false;

const initRecognition = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && !recognitionInitialized) {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-ES';
        recognition.maxAlternatives = 1;
        recognitionInitialized = true;
        console.log('✅ Speech recognition initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
    }
  }
  return recognition;
};

const checkWebSpeechSupport = (): boolean => {
  if (Platform.OS !== 'web') return true;
  if (typeof window === 'undefined') return false;
  try {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  } catch {
    return false;
  }
};

export const [VoiceProvider, useVoice] = createContextHook(() => {
  const [state, setState] = useState<VoiceState>(() => ({
    isListening: false,
    isSupported: Platform.OS !== 'web' ? true : checkWebSpeechSupport(),
    transcript: '',
    lastCommand: '',
    error: null,
  }));

  const commandsRef = useRef<Map<string, VoiceCommand>>(new Map());
  const lastProcessedTextRef = useRef('');
  const lastProcessedTimeRef = useRef(0);
  const shouldRestartRef = useRef(true);
  const restartTimeoutRef = useRef<any>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingIntervalRef = useRef<any>(null);

  const speak = useCallback((text: string) => {
    try {
      if (Platform.OS !== 'web') {
        Speech.speak(text, {
          language: 'es-ES',
          rate: 0.95,
          pitch: 1.05,
          voice: undefined,
        });
      } else if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(voice => 
          voice.lang.startsWith('es') && !voice.name.includes('Google')
        ) || voices.find(voice => voice.lang.startsWith('es'));
        
        if (spanishVoice) {
          utterance.voice = spanishVoice;
        }
        
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Speech error:', error);
    }
  }, []);

  const registerCommand = useCallback((id: string, command: VoiceCommand) => {
    console.log('Registering voice command:', id, command.patterns);
    commandsRef.current.set(id, command);
  }, []);

  const unregisterCommand = useCallback((id: string) => {
    console.log('Unregistering voice command:', id);
    commandsRef.current.delete(id);
  }, []);

  const normalizeSpanish = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
      .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ü/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[.,;:!?¿¡]/g, '')
      .replace(/\s+/g, ' ');
  }, []);

  const calculateSimilarity = useCallback((str1: string, str2: string): number => {
    const s1 = normalizeSpanish(str1);
    const s2 = normalizeSpanish(str2);
    
    if (s1 === s2) return 100;
    if (s1.includes(s2) || s2.includes(s1)) {
      const longer = s1.length > s2.length ? s1 : s2;
      const shorter = s1.length > s2.length ? s2 : s1;
      return (shorter.length / longer.length) * 95;
    }
    
    const words1 = s1.split(' ');
    const words2 = s2.split(' ');
    let matchedWords = 0;
    for (const w1 of words1) {
      if (w1.length > 2) {
        for (const w2 of words2) {
          if (w2.length > 2 && (w1.includes(w2) || w2.includes(w1) || w1 === w2)) {
            matchedWords++;
            break;
          }
        }
      }
    }
    if (matchedWords > 0) {
      return (matchedWords / Math.max(words1.length, words2.length)) * 80;
    }
    
    return 0;
  }, [normalizeSpanish]);

  const processTranscript = useCallback((text: string) => {
    const now = Date.now();
    const normalizedText = normalizeSpanish(text);
    
    if (!normalizedText || normalizedText.length < 2) return;
    
    if (lastProcessedTextRef.current === normalizedText && now - lastProcessedTimeRef.current < 6000) {
      console.log('Skipping duplicate command within 6 seconds');
      return;
    }
    
    lastProcessedTextRef.current = normalizedText;
    lastProcessedTimeRef.current = now;
    
    console.log('Processing transcript:', normalizedText);
    console.log('Available commands:', Array.from(commandsRef.current.keys()));
    
    let bestMatch: { id: string; command: VoiceCommand; pattern: string; score: number } | null = null;
    
    for (const [id, command] of commandsRef.current.entries()) {
      for (const pattern of command.patterns) {
        const normalizedPattern = normalizeSpanish(pattern);
        
        if (normalizedText === normalizedPattern) {
          bestMatch = { id, command, pattern, score: 100 };
          break;
        }
        
        const similarity = calculateSimilarity(normalizedText, normalizedPattern);
        if (similarity > 0 && (!bestMatch || similarity > bestMatch.score)) {
          bestMatch = { id, command, pattern, score: similarity };
        }
        
        if (normalizedText.includes(normalizedPattern)) {
          const score = (normalizedPattern.length / normalizedText.length) * 100;
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { id, command, pattern, score };
          }
        }
      }
      if (bestMatch && bestMatch.score === 100) break;
    }
    
    if (bestMatch && bestMatch.score > 30) {
      console.log('✅ Matched command:', bestMatch.id, bestMatch.pattern, 'score:', bestMatch.score);
      
      setState(prev => ({ ...prev, lastCommand: bestMatch.pattern }));
      if (bestMatch.command.description && bestMatch.command.description.trim() !== '') {
        speak(bestMatch.command.description);
      }
      
      setTimeout(() => {
        try {
          bestMatch.command.action();
        } catch (error) {
          console.error('Error executing command:', error);
        }
      }, 100);
    } else {
      console.log('❌ No matching command found or score too low:', bestMatch?.score);
      console.log('Tried to match against:', normalizedText);
    }
  }, [speak, normalizeSpanish, calculateSimilarity]);

  const startListening = useCallback(async () => {
    setState(prev => {
      if (!prev.isSupported) {
        Alert.alert('No soportado', 'El reconocimiento de voz no está disponible en este dispositivo');
        return prev;
      }

      if (prev.isListening) return prev;

      console.log('Starting voice recognition');

      if (Platform.OS === 'web') {
        const rec = initRecognition();
        if (!rec) {
          setState(current => ({ 
            ...current, 
            isListening: false, 
            error: 'El reconocimiento de voz no está disponible en este navegador'
          }));
          Alert.alert('Error', 'El reconocimiento de voz no está disponible en este navegador');
          return prev;
        }
        
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            shouldRestartRef.current = true;
            setState(current => ({ ...current, isListening: true, error: null, transcript: '' }));
            
            try {
              rec.start();
              speak('Escuchando comandos de voz');
              console.log('✅ Recognition started');
            } catch (startError: any) {
              if (startError.name === 'InvalidStateError') {
                console.log('Recognition already started');
                setState(current => ({ ...current, isListening: true }));
              } else {
                throw startError;
              }
            }
          })
          .catch((error: any) => {
            console.error('Error starting recognition:', error);
            
            let errorMessage = 'Error al iniciar el reconocimiento de voz';
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
              errorMessage = 'Permiso de micrófono denegado. Por favor, permite el acceso al micrófono en la configuración del navegador.';
            } else if (error.name === 'NotFoundError') {
              errorMessage = 'No se encontró ningún micrófono. Por favor, conecta un micrófono.';
            } else if (error.name === 'NotReadableError') {
              errorMessage = 'El micrófono está siendo usado por otra aplicación.';
            }
            
            setState(current => ({ 
              ...current, 
              isListening: false, 
              error: errorMessage
            }));
            Alert.alert('Error', errorMessage);
          });
      } else if (Platform.OS === 'android' || Platform.OS === 'ios') {
        startNativeRecording().then(() => {
          setState(current => ({ ...current, isListening: true, error: null, transcript: '' }));
          speak('Escuchando comandos de voz');
        }).catch((error) => {
          console.error('Error starting native recording:', error);
          setState(current => ({ 
            ...current, 
            isListening: false, 
            error: 'Error al iniciar el reconocimiento de voz'
          }));
          Alert.alert('Error', 'No se pudo iniciar el reconocimiento de voz');
        });
      }
      
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak]);

  const stopListening = useCallback(() => {
    setState(prev => {
      if (!prev.isListening) return prev;

      console.log('Stopping voice recognition');
      shouldRestartRef.current = false;
      
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      if (Platform.OS === 'web') {
        const rec = initRecognition();
        if (rec) {
          try {
            rec.stop();
            console.log('✅ Recognition stopped');
          } catch (error: any) {
            if (error.name !== 'InvalidStateError') {
              console.error('Error stopping recognition:', error);
            }
          }
        }
      } else if (Platform.OS === 'android' || Platform.OS === 'ios') {
        stopNativeRecording();
      }
      
      return { ...prev, isListening: false, transcript: '' };
    });
  }, []);

  const startNativeRecording = async () => {
    try {
      console.log('Requesting audio permissions...');
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Permiso de micrófono denegado');
      }

      console.log('Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('Creating new Recording instance...');
      const recording = new Audio.Recording();
      
      console.log('Preparing to record...');
      const recordingOptions: any = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      };
      
      try {
        await recording.prepareToRecordAsync(recordingOptions);
        await new Promise(resolve => setTimeout(resolve, 100));
        await recording.startAsync();
        recordingRef.current = recording;
        console.log('Recording started successfully');
      } catch (prepareError) {
        console.error('Error preparing/starting recorder:', prepareError);
        try {
          const status = await recording.getStatusAsync();
          if (status.canRecord || status.isRecording) {
            await recording.stopAndUnloadAsync();
          }
        } catch (cleanupErr) {
          console.error('Error cleaning up failed recording:', cleanupErr);
        }
        throw prepareError;
      }
      
      recordingIntervalRef.current = setInterval(() => {
        processNativeRecording();
      }, 3000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {
          console.error('Error cleaning up after failed start:', e);
        }
        recordingRef.current = null;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      }).catch(() => {});
      throw error;
    }
  };

  const stopNativeRecording = async () => {
    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      if (recordingRef.current) {
        console.log('Stopping recording...');
        await recordingRef.current.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
        recordingRef.current = null;
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const restartRecording = async () => {
    try {
      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.canRecord || status.isRecording) {
            await recordingRef.current.stopAndUnloadAsync();
          }
        } catch (cleanupError) {
          console.error('Error cleaning up previous recording:', cleanupError);
        }
        recordingRef.current = null;
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const newRecording = new Audio.Recording();
      
      const recordingOptions: any = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      };
      
      try {
        await newRecording.prepareToRecordAsync(recordingOptions);
        await new Promise(resolve => setTimeout(resolve, 100));
        await newRecording.startAsync();
        recordingRef.current = newRecording;
        console.log('Recording restarted successfully');
      } catch (prepareError) {
        console.error('Error preparing/starting recorder on restart:', prepareError);
        try {
          const status = await newRecording.getStatusAsync();
          if (status.canRecord || status.isRecording) {
            await newRecording.stopAndUnloadAsync();
          }
        } catch (cleanupErr) {
          console.error('Error cleaning up failed recording on restart:', cleanupErr);
        }
        throw prepareError;
      }
    } catch (error) {
      console.error('Failed to restart recording:', error);
      recordingRef.current = null;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      }).catch(() => {});
      throw error;
    }
  };

  const processNativeRecording = async () => {
    if (!recordingRef.current) {
      return;
    }

    try {
      console.log('Processing audio chunk...');
      
      const currentRecording = recordingRef.current;
      recordingRef.current = null;
      
      const status = await currentRecording.getStatusAsync();
      if (!status.isRecording) {
        console.log('Recording is not active, skipping...');
        if (shouldRestartRef.current) {
          await restartRecording();
        }
        return;
      }
      
      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();
      
      if (!uri) {
        console.error('No recording URI');
        if (shouldRestartRef.current) {
          await restartRecording();
        }
        return;
      }

      const formData = new FormData();
      const fileType = Platform.OS === 'ios' ? 'audio/wav' : 'audio/m4a';
      const fileName = Platform.OS === 'ios' ? 'recording.wav' : 'recording.m4a';

      formData.append('audio', {
        uri,
        name: fileName,
        type: fileType,
      } as any);
      
      formData.append('language', 'es');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await fetch(STT_API_URL, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('STT API Error:', response.status, errorBody);
          throw new Error(`STT API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.text) {
          const transcript = result.text;
          console.log('Recognized:', transcript);
          setState(prev => ({ ...prev, transcript, error: null }));
          processTranscript(transcript);
        } else {
          console.log('No speech detected in audio chunk');
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.warn('STT request timeout, continuing...');
        } else {
          console.error('STT fetch error:', fetchError);
          setState(prev => ({ ...prev, error: null }));
        }
      }

      if (shouldRestartRef.current) {
        await restartRecording();
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      
      if (shouldRestartRef.current) {
        try {
          await restartRecording();
        } catch (restartError) {
          console.error('Failed to restart after error:', restartError);
          setState(prev => ({ 
            ...prev, 
            error: 'No se pudo reiniciar el reconocimiento de voz',
            isListening: false
          }));
          shouldRestartRef.current = false;
        }
      }
    }
  };

  useEffect(() => {
    const rec = initRecognition();
    if (Platform.OS === 'web' && rec) {
      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        setState(prev => ({ ...prev, transcript: currentTranscript }));

        if (finalTranscript) {
          processTranscript(finalTranscript);
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'no-speech') {
          console.log('No speech detected, continuing to listen...');
          return;
        }
        
        if (event.error === 'aborted') {
          console.log('Recognition aborted, will restart if needed');
          return;
        }
        
        let errorMessage = '';
        let shouldStop = false;
        
        switch (event.error) {
          case 'audio-capture':
            errorMessage = 'No se pudo acceder al micrófono. Verifica que esté conectado y funcionando.';
            shouldStop = true;
            break;
          case 'not-allowed':
            errorMessage = 'Permiso de micrófono denegado. Por favor, permite el acceso al micrófono.';
            shouldStop = true;
            break;
          case 'network':
            console.log('⚠️ Network error in speech recognition - will auto-restart');
            return;
          case 'service-not-allowed':
            errorMessage = 'El servicio de reconocimiento de voz no está disponible.';
            shouldStop = true;
            break;
          case 'bad-grammar':
            console.log('Grammar error, continuing...');
            return;
          default:
            console.warn('Unknown recognition error:', event.error);
            return;
        }
        
        if (errorMessage) {
          setState(prev => ({ 
            ...prev, 
            error: errorMessage,
            isListening: shouldStop ? false : prev.isListening
          }));
          
          if (shouldStop) {
            shouldRestartRef.current = false;
          }
        }
      };

      rec.onend = () => {
        console.log('Speech recognition ended');
        
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
        }
        
        setState(prev => {
          if (prev.isListening && shouldRestartRef.current) {
            restartTimeoutRef.current = setTimeout(() => {
              setState(current => {
                if (current.isListening && shouldRestartRef.current && rec) {
                  try {
                    rec.start();
                    console.log('🔄 Recognition restarted automatically');
                  } catch (startError: any) {
                    if (startError.name === 'InvalidStateError') {
                      console.log('Recognition already started, ignoring');
                    } else {
                      console.error('Error restarting recognition:', startError);
                    }
                  }
                }
                return current;
              });
            }, 300);
          }
          return prev;
        });
      };
    }

    return () => {
      shouldRestartRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      const cleanupRec = initRecognition();
      if (Platform.OS === 'web' && cleanupRec) {
        try {
          cleanupRec.stop();
          console.log('🧹 Recognition cleaned up');
        } catch (error: any) {
          if (error.name !== 'InvalidStateError') {
            console.error('Error cleaning up recognition:', error);
          }
        }
      }
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        stopNativeRecording();
      }
    };
  }, [processTranscript]);

  const setGoogleCloudApiKey = useCallback((apiKey: string) => {
    // Deprecated
    console.log('Google Cloud API key is no longer needed.');
  }, []);

  return useMemo(() => ({
    ...state,
    startListening,
    stopListening,
    registerCommand,
    unregisterCommand,
    speak,
    setGoogleCloudApiKey,
    isGoogleCloudConfigured: true,
  }), [state, startListening, stopListening, registerCommand, unregisterCommand, speak, setGoogleCloudApiKey]);
});
