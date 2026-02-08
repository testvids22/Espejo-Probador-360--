import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Platform,
  Alert,
  Dimensions,
  PanResponder,
  Animated,
  Linking,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { 
  FileText, 
  PenTool, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Download, 
  Share2,
  Volume2,
  VolumeX,
  User,
  AtSign,
  Shield,
  Info,
  RotateCcw,
  Eye
} from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIGNATURE_WIDTH = Math.min(SCREEN_WIDTH - 80, 400);
const SIGNATURE_HEIGHT = 180;

type UserData = {
  firstName: string;
  lastName: string;
  email: string;
};

export type RGPDContactInfo = {
  email?: string;
  telefono?: string;
  direccion?: string;
  responsable?: string;
};

type GDPRConsentFormProps = {
  visible: boolean;
  onClose: () => void;
  onConsent: (userData: UserData, signatureData: string) => void;
  existingUserData?: Partial<UserData>;
  /** Datos de contacto desde Ajustes (email, teléfono, dirección, responsable) */
  rgpdContact?: RGPDContactInfo;
  /** Texto del reglamento RGPD desde Ajustes */
  rgpdConsentText?: string;
};

export default function GDPRConsentForm({ 
  visible, 
  onClose, 
  onConsent,
  existingUserData,
  rgpdContact,
  rgpdConsentText,
}: GDPRConsentFormProps) {
  const [step, setStep] = useState<'form' | 'summary' | 'signature' | 'complete'>('form');
  const [userData, setUserData] = useState<UserData>({
    firstName: existingUserData?.firstName || '',
    lastName: existingUserData?.lastName || '',
    email: existingUserData?.email || '',
  });
  const [signatureData, setSignatureData] = useState<string>('');
  const [paths, setPaths] = useState<{ x: number; y: number }[][]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);
  const pathsRef = useRef<{ x: number; y: number }[][]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showFullConsent, setShowFullConsent] = useState(false);
  const canvasRef = useRef<View>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasSpokenWelcome = useRef(false);

  const speakText = useCallback(async (text: string, force: boolean = false) => {
    if (isSpeaking && !force) {
      await Speech.stop();
      setIsSpeaking(false);
      return;
    }

    if (isSpeaking) {
      await Speech.stop();
    }

    setIsSpeaking(true);
    try {
      await Speech.speak(text, {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.85,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error('Error speaking:', error);
      setIsSpeaking(false);
    }
  }, []);

  const speakWelcome = useCallback((force: boolean = false) => {
    const welcomeText = `Bienvenido al formulario de consentimiento RGPD del Espejo Virtual GV360. 
    Por favor, introduce tus datos personales: nombre, apellidos y correo electrónico. 
    Tus datos están protegidos según la normativa europea de protección de datos. 
    Una vez completado el formulario, podrás leer el resumen del consentimiento y firmarlo digitalmente.`;
    speakText(welcomeText, force);
  }, [speakText]);

  // Initialize form when visible and auto-speak welcome
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setStep('form');
      setSignatureData('');
      setPaths([]);
      setCurrentPath([]);
      currentPathRef.current = [];
      pathsRef.current = [];
      setUserData({ 
        firstName: existingUserData?.firstName || '', 
        lastName: existingUserData?.lastName || '', 
        email: existingUserData?.email || '' 
      });
      
      // Auto-speak welcome message when form opens (only once)
      if (!hasSpokenWelcome.current) {
        hasSpokenWelcome.current = true;
        const timer = setTimeout(() => {
          speakWelcome(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } else {
      // Reset flag when modal closes
      hasSpokenWelcome.current = false;
    }
  }, [visible, fadeAnim, existingUserData]);

  const speakSummary = useCallback((force: boolean = false) => {
    const summaryText = `Resumen del consentimiento informado. 
    Al firmar este documento, autorizas el tratamiento de tus datos personales y corporales 
    exclusivamente para el funcionamiento del espejo probador virtual. 
    Tus datos se almacenan de forma segura y encriptada en tu dispositivo. 
    No se comparten con terceros sin tu consentimiento expreso. 
    Puedes solicitar la eliminación de tus datos en cualquier momento desde la configuración del perfil.
    Confirma tu consentimiento con tu firma digital.`;
    speakText(summaryText, force);
  }, [speakText]);

  const speakSignatureInstructions = useCallback((force: boolean = false) => {
    const instructionsText = `Por favor, firma en el recuadro usando tu dedo o lápiz táctil. 
    Puedes borrar la firma con el botón de reiniciar si lo necesitas. 
    Una vez satisfecho con tu firma, pulsa confirmar para completar el proceso.`;
    speakText(instructionsText, force);
  }, [speakText]);

  const speakComplete = useCallback((force: boolean = false) => {
    const completeText = `Tu consentimiento ha sido registrado correctamente. 
    Ahora puedes exportar el documento en PDF, enviarlo por correo electrónico 
    o compartirlo por Bluetooth. 
    Gracias por confiar en el Espejo Virtual GV360.`;
    speakText(completeText, force);
  }, [speakText]);

  // Auto-speak complete message when reaching complete step
  const hasSpokenComplete = useRef(false);
  useEffect(() => {
    if (step === 'complete' && visible && !hasSpokenComplete.current) {
      hasSpokenComplete.current = true;
      setTimeout(() => {
        speakComplete(true);
      }, 500);
    } else if (step !== 'complete') {
      hasSpokenComplete.current = false;
    }
  }, [step, visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPath = [{ x: locationX, y: locationY }];
        currentPathRef.current = newPath;
        setCurrentPath(newPath);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPath = [...currentPathRef.current, { x: locationX, y: locationY }];
        currentPathRef.current = newPath;
        setCurrentPath(newPath);
      },
      onPanResponderRelease: () => {
        if (currentPathRef.current.length > 0) {
          const newPaths = [...pathsRef.current, currentPathRef.current];
          pathsRef.current = newPaths;
          setPaths(newPaths);
          currentPathRef.current = [];
          setCurrentPath([]);
        }
      },
    })
  ).current;

  const clearSignature = () => {
    setPaths([]);
    setCurrentPath([]);
    setSignatureData('');
    currentPathRef.current = [];
    pathsRef.current = [];
  };

  const generateSignatureData = useCallback(() => {
    // Use ref for most current data
    const currentPaths = pathsRef.current.length > 0 ? pathsRef.current : paths;
    if (currentPaths.length === 0) return '';
    const timestamp = new Date().toISOString();
    const dataStr = JSON.stringify({ paths: currentPaths, timestamp, user: userData });
    return btoa(encodeURIComponent(dataStr));
  }, [paths, userData]);

  const handleConfirmSignature = () => {
    // Check both state and ref for signature data
    const hasPaths = paths.length > 0 || pathsRef.current.length > 0;
    if (!hasPaths) {
      Alert.alert('Firma requerida', 'Por favor, firma en el recuadro antes de continuar.');
      speakText('Por favor, firma en el recuadro antes de continuar.');
      return;
    }
    const sigData = generateSignatureData();
    setSignatureData(sigData);
    setStep('complete');
    // Note: speakComplete is called automatically by useEffect when step becomes 'complete'
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleContinueToSummary = () => {
    if (!userData.firstName.trim() || !userData.lastName.trim()) {
      Alert.alert('Datos incompletos', 'Por favor, introduce tu nombre y apellidos.');
      speakText('Por favor, introduce tu nombre y apellidos.');
      return;
    }
    if (!userData.email.trim() || !validateEmail(userData.email)) {
      Alert.alert('Email inválido', 'Por favor, introduce un correo electrónico válido.');
      speakText('Por favor, introduce un correo electrónico válido.');
      return;
    }
    setStep('summary');
    setTimeout(() => speakSummary(true), 500);
  };

  const handleContinueToSignature = () => {
    setStep('signature');
    setTimeout(() => speakSignatureInstructions(true), 500);
  };

  const generatePDFContent = (): string => {
    const date = new Date().toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
CONSENTIMIENTO INFORMADO - RGPD
================================
Espejo Probador Virtual GV360º

Fecha: ${date}

DATOS DEL USUARIO
-----------------
Nombre: ${userData.firstName}
Apellidos: ${userData.lastName}
Email: ${userData.email}

INFORMACIÓN SOBRE PROTECCIÓN DE DATOS
-------------------------------------
De conformidad con el Reglamento General de Protección de Datos (RGPD) 
y la Ley Orgánica 3/2018 de Protección de Datos Personales, le informamos:

1. RESPONSABLE DEL TRATAMIENTO
   Espejo Virtual GV360º

2. FINALIDAD DEL TRATAMIENTO
   - Funcionamiento del espejo probador virtual
   - Almacenamiento temporal de medidas corporales
   - Personalización de la experiencia de usuario

3. LEGITIMACIÓN
   Consentimiento del interesado

4. DESTINATARIOS
   No se cederán datos a terceros salvo obligación legal

5. DERECHOS
   - Acceso, rectificación y supresión de datos
   - Limitación y oposición al tratamiento
   - Portabilidad de datos
   - Retirada del consentimiento

6. CONSERVACIÓN DE DATOS
   Los datos se almacenan localmente en el dispositivo
   y pueden ser eliminados en cualquier momento

DECLARACIÓN DE CONSENTIMIENTO
-----------------------------
El usuario declara haber sido informado de las condiciones 
del tratamiento de sus datos personales y presta su 
consentimiento libre, específico, informado e inequívoco 
para el tratamiento de los mismos.

FIRMA DIGITAL
-------------
Fecha de firma: ${date}
ID de firma: ${signatureData.substring(0, 20)}...

================================
Documento generado automáticamente
Espejo Virtual GV360º - Todos los derechos reservados
    `;
  };

  const handleExportPDF = async () => {
    try {
      const content = generatePDFContent();
      
      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `consentimiento_gdpr_${userData.lastName}_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Alert.alert('Éxito', 'Documento descargado correctamente');
        speakText('Documento descargado correctamente');
      } else {
        const fileUri = `${FileSystem.documentDirectory}consentimiento_gdpr_${userData.lastName}_${Date.now()}.txt`;
        await FileSystem.writeAsStringAsync(fileUri, content);
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri);
          speakText('Documento listo para compartir');
        } else {
          Alert.alert('Guardado', `Documento guardado en: ${fileUri}`);
          speakText('Documento guardado correctamente');
        }
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Error', 'No se pudo exportar el documento');
      speakText('Error al exportar el documento');
    }
  };

  const handleSendEmail = async () => {
    const subject = encodeURIComponent('Consentimiento RGPD - Espejo Virtual GV360º');
    const body = encodeURIComponent(generatePDFContent());
    const mailtoUrl = `mailto:${userData.email}?subject=${subject}&body=${body}`;
    
    if (Platform.OS === 'web') {
      window.open(mailtoUrl, '_blank');
    } else {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert('Error', 'No se pudo abrir el cliente de correo');
      }
    }
    speakText('Abriendo cliente de correo electrónico');
  };

  const handleShareBluetooth = async () => {
    try {
      const content = generatePDFContent();
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: 'Consentimiento RGPD - Espejo Virtual GV360º',
            text: content,
          });
          speakText('Documento compartido correctamente');
        } else {
          Alert.alert('No disponible', 'La función de compartir no está disponible en este navegador');
          speakText('La función de compartir no está disponible en este navegador');
        }
      } else {
        const fileUri = `${FileSystem.documentDirectory}consentimiento_gdpr_${Date.now()}.txt`;
        await FileSystem.writeAsStringAsync(fileUri, content);
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/plain',
            dialogTitle: 'Compartir Consentimiento RGPD',
          });
          speakText('Selecciona cómo deseas compartir el documento');
        } else {
          Alert.alert('No disponible', 'La función de compartir no está disponible');
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      speakText('Error al compartir el documento');
    }
  };

  const handleComplete = () => {
    onConsent(userData, signatureData);
    // Don't call onClose here - it triggers the "GDPR required" loop
    // The parent component will handle closing after receiving consent
    speakText('Consentimiento completado. Bienvenido al Espejo Virtual GV360.');
  };

  const renderPath = (pathPoints: { x: number; y: number }[], index: number) => {
    if (pathPoints.length < 2) return null;
    
    return (
      <View key={index} style={StyleSheet.absoluteFill} pointerEvents="none">
        {pathPoints.map((point, i) => {
          if (i === 0) return null;
          const prev = pathPoints[i - 1];
          const dx = point.x - prev.x;
          const dy = point.y - prev.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          
          return (
            <View
              key={i}
              style={[
                styles.signatureLine,
                {
                  left: prev.x,
                  top: prev.y - 1.5,
                  width: length,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const renderFormStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <View style={styles.iconCircle}>
          <Shield size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.stepTitle}>Consentimiento RGPD</Text>
        <Text style={styles.stepSubtitle}>Protección de Datos Personales</Text>
      </View>
      {(rgpdContact?.email || rgpdContact?.telefono || rgpdContact?.direccion || rgpdContact?.responsable) && (
        <View style={styles.rgpdContactBlock}>
          <Text style={styles.rgpdContactTitle}>Datos del responsable (configurados en Ajustes)</Text>
          {rgpdContact.responsable ? <View style={styles.rgpdContactLine}><User size={14} color={Colors.light.primary} /><Text style={styles.rgpdContactLineText}>{rgpdContact.responsable}</Text></View> : null}
          {rgpdContact.email ? <View style={styles.rgpdContactLine}><Mail size={14} color={Colors.light.primary} /><Text style={styles.rgpdContactLineText}>{rgpdContact.email}</Text></View> : null}
          {rgpdContact.telefono ? <View style={styles.rgpdContactLine}><Text style={styles.rgpdContactLineText}>📞 {rgpdContact.telefono}</Text></View> : null}
          {rgpdContact.direccion ? <View style={styles.rgpdContactLine}><Text style={styles.rgpdContactLineText}>📍 {rgpdContact.direccion}</Text></View> : null}
        </View>
      )}
      {rgpdConsentText && rgpdConsentText.trim().length > 0 && (
        <View style={styles.rgpdTextBlock}>
          <Text style={styles.rgpdTextBlockTitle}>Reglamento / Política de privacidad</Text>
          <ScrollView horizontal style={styles.rgpdTextScroll} contentContainerStyle={styles.rgpdTextScrollContent}>
            <Text style={styles.rgpdTextContent}>{rgpdConsentText}</Text>
          </ScrollView>
        </View>
      )}
      <View style={styles.headerSection}>
        
        <TouchableOpacity 
          style={[styles.speakButton, isSpeaking && styles.speakButtonActive]}
          onPress={() => speakWelcome()}
        >
          {isSpeaking ? (
            <VolumeX size={20} color="#FFFFFF" />
          ) : (
            <Volume2 size={20} color={Colors.light.primary} />
          )}
          <Text style={[styles.speakButtonText, isSpeaking && styles.speakButtonTextActive]}>
            {isSpeaking ? 'Detener' : 'Escuchar'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <View style={styles.inputLabel}>
            <User size={16} color={Colors.light.primary} />
            <Text style={styles.labelText}>Nombre *</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Tu nombre"
            value={userData.firstName}
            onChangeText={(text) => setUserData(prev => ({ ...prev, firstName: text }))}
            autoCapitalize="words"
            onFocus={() => {
              // Clear field on focus if it contains placeholder-like text
              if (userData.firstName === existingUserData?.firstName) {
                setUserData(prev => ({ ...prev, firstName: '' }));
              }
            }}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputLabel}>
            <User size={16} color={Colors.light.primary} />
            <Text style={styles.labelText}>Apellidos *</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Tus apellidos"
            value={userData.lastName}
            onChangeText={(text) => setUserData(prev => ({ ...prev, lastName: text }))}
            autoCapitalize="words"
            onFocus={() => {
              // Clear field on focus if it contains placeholder-like text
              if (userData.lastName === existingUserData?.lastName) {
                setUserData(prev => ({ ...prev, lastName: '' }));
              }
            }}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputLabel}>
            <AtSign size={16} color={Colors.light.primary} />
            <Text style={styles.labelText}>Correo Electrónico *</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            value={userData.email}
            onChangeText={(text) => setUserData(prev => ({ ...prev, email: text }))}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={styles.infoCard}>
        <Info size={20} color={Colors.light.primary} />
        <Text style={styles.infoText}>
          Tus datos están protegidos según el RGPD europeo. Solo se utilizan para el funcionamiento del espejo virtual.
        </Text>
      </View>
    </ScrollView>
  );

  const renderSummaryStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <View style={[styles.iconCircle, { backgroundColor: '#10B981' }]}>
          <FileText size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.stepTitle}>Resumen del Consentimiento</Text>
        
        <TouchableOpacity 
          style={[styles.speakButton, isSpeaking && styles.speakButtonActive]}
          onPress={() => speakSummary()}
        >
          {isSpeaking ? (
            <VolumeX size={20} color="#FFFFFF" />
          ) : (
            <Volume2 size={20} color={Colors.light.primary} />
          )}
          <Text style={[styles.speakButtonText, isSpeaking && styles.speakButtonTextActive]}>
            {isSpeaking ? 'Detener' : 'Escuchar Resumen'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.userDataCard}>
        <Text style={styles.cardTitle}>Tus Datos</Text>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Nombre:</Text>
          <Text style={styles.dataValue}>{userData.firstName} {userData.lastName}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Email:</Text>
          <Text style={styles.dataValue}>{userData.email}</Text>
        </View>
      </View>

      <View style={styles.consentSummaryCard}>
        <Text style={styles.cardTitle}>Puntos Clave del Consentimiento</Text>
        
        <View style={styles.consentPoint}>
          <CheckCircle size={18} color="#10B981" />
          <Text style={styles.consentPointText}>
            Tus datos se almacenan localmente en tu dispositivo
          </Text>
        </View>
        
        <View style={styles.consentPoint}>
          <CheckCircle size={18} color="#10B981" />
          <Text style={styles.consentPointText}>
            No se comparten con terceros sin tu consentimiento
          </Text>
        </View>
        
        <View style={styles.consentPoint}>
          <CheckCircle size={18} color="#10B981" />
          <Text style={styles.consentPointText}>
            Puedes eliminar tus datos en cualquier momento
          </Text>
        </View>
        
        <View style={styles.consentPoint}>
          <CheckCircle size={18} color="#10B981" />
          <Text style={styles.consentPointText}>
            Datos encriptados y protegidos según RGPD
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.viewFullConsentButton}
        onPress={() => setShowFullConsent(true)}
      >
        <Eye size={18} color={Colors.light.primary} />
        <Text style={styles.viewFullConsentText}>Ver Consentimiento Completo</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderSignatureStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <View style={[styles.iconCircle, { backgroundColor: '#8B5CF6' }]}>
          <PenTool size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.stepTitle}>Firma Digital</Text>
        <Text style={styles.stepSubtitle}>Firma con tu dedo o lápiz táctil</Text>
        
        <TouchableOpacity 
          style={[styles.speakButton, isSpeaking && styles.speakButtonActive]}
          onPress={() => speakSignatureInstructions()}
        >
          {isSpeaking ? (
            <VolumeX size={20} color="#FFFFFF" />
          ) : (
            <Volume2 size={20} color={Colors.light.primary} />
          )}
          <Text style={[styles.speakButtonText, isSpeaking && styles.speakButtonTextActive]}>
            {isSpeaking ? 'Detener' : 'Instrucciones'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.signatureContainer}>
        <Text style={styles.signatureLabel}>Firme aquí:</Text>
        <View 
          ref={canvasRef}
          style={styles.signatureCanvas}
          {...panResponder.panHandlers}
        >
          {paths.map((path, index) => renderPath(path, index))}
          {renderPath(currentPath, paths.length)}
          
          {paths.length === 0 && currentPath.length === 0 && (
            <View style={styles.signaturePlaceholder}>
              <PenTool size={32} color={Colors.light.border} />
              <Text style={styles.signaturePlaceholderText}>
                Dibuja tu firma aquí
              </Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity style={styles.clearButton} onPress={clearSignature}>
          <RotateCcw size={18} color={Colors.light.textSecondary} />
          <Text style={styles.clearButtonText}>Borrar Firma</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.signatureInfo}>
        <Text style={styles.signatureInfoText}>
          Al firmar, confirmas que has leído y aceptas los términos del consentimiento RGPD.
        </Text>
      </View>
    </ScrollView>
  );

  const renderCompleteStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <View style={[styles.iconCircle, { backgroundColor: '#10B981' }]}>
          <CheckCircle size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.stepTitle}>¡Consentimiento Firmado!</Text>
        <Text style={styles.stepSubtitle}>Tu documento está listo</Text>
        
        <TouchableOpacity 
          style={[styles.speakButton, isSpeaking && styles.speakButtonActive]}
          onPress={() => speakComplete()}
        >
          {isSpeaking ? (
            <VolumeX size={20} color="#FFFFFF" />
          ) : (
            <Volume2 size={20} color={Colors.light.primary} />
          )}
          <Text style={[styles.speakButtonText, isSpeaking && styles.speakButtonTextActive]}>
            {isSpeaking ? 'Detener' : 'Escuchar'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.completeCard}>
        <Text style={styles.cardTitle}>Opciones de Exportación</Text>
        
        <TouchableOpacity style={styles.exportButton} onPress={handleExportPDF}>
          <Download size={22} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>Guardar / Imprimir PDF</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.exportButton, styles.exportButtonEmail]} onPress={handleSendEmail}>
          <Mail size={22} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>Enviar por Email</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.exportButton, styles.exportButtonShare]} onPress={handleShareBluetooth}>
          <Share2 size={22} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>Compartir (Bluetooth/Otros)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.successInfo}>
        <Text style={styles.successInfoText}>
          Tu consentimiento ha sido registrado correctamente. Puedes exportar una copia del documento para tus archivos.
        </Text>
      </View>
    </ScrollView>
  );

  const renderFullConsentModal = () => (
    <Modal
      visible={showFullConsent}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFullConsent(false)}
    >
      <View style={styles.fullConsentOverlay}>
        <View style={styles.fullConsentContent}>
          <View style={styles.fullConsentHeader}>
            <Text style={styles.fullConsentTitle}>Consentimiento Completo</Text>
            <TouchableOpacity onPress={() => setShowFullConsent(false)}>
              <XCircle size={28} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.fullConsentScroll}>
            <Text style={styles.fullConsentText}>
              {`CONSENTIMIENTO INFORMADO PARA EL TRATAMIENTO DE DATOS PERSONALES

De conformidad con lo establecido en el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo de 27 de abril de 2016 (RGPD) y la Ley Orgánica 3/2018 de 5 de diciembre de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), le informamos:

1. RESPONSABLE DEL TRATAMIENTO
Espejo Virtual GV360º es el responsable del tratamiento de los datos personales facilitados.

2. FINALIDAD DEL TRATAMIENTO
Sus datos personales serán tratados con las siguientes finalidades:
- Funcionamiento del espejo probador virtual de ropa
- Almacenamiento temporal de fotografías y medidas corporales
- Personalización de la experiencia de usuario
- Recomendación de tallas y prendas

3. LEGITIMACIÓN
La base legal para el tratamiento de sus datos es el consentimiento del interesado.

4. DESTINATARIOS
No se cederán datos a terceros salvo obligación legal. Los datos se almacenan únicamente en el dispositivo del usuario.

5. DERECHOS DEL INTERESADO
Puede ejercer sus derechos de acceso, rectificación, supresión, limitación, oposición y portabilidad:
- Accediendo a la configuración de perfil de la aplicación
- Eliminando la aplicación del dispositivo
- Contactando con soporte técnico

6. CONSERVACIÓN DE DATOS
Los datos se conservarán mientras el usuario mantenga la aplicación instalada y no solicite su eliminación.

7. MEDIDAS DE SEGURIDAD
Se han adoptado las medidas técnicas y organizativas necesarias para garantizar la seguridad de los datos:
- Almacenamiento local encriptado
- Sin transmisión de datos a servidores externos
- Control de acceso mediante perfiles privados

8. CONSENTIMIENTO
Al firmar este documento, el usuario declara:
- Haber sido informado de forma clara y comprensible
- Prestar su consentimiento libre, específico e inequívoco
- Autorizar el tratamiento de sus datos para las finalidades indicadas

Fecha: ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {['form', 'summary', 'signature', 'complete'].map((s, index) => (
        <View key={s} style={styles.stepDot}>
          <View style={[
            styles.dot,
            (step === s || ['form', 'summary', 'signature', 'complete'].indexOf(step) > index) && styles.dotActive
          ]} />
          {index < 3 && <View style={[
            styles.stepLine,
            ['form', 'summary', 'signature', 'complete'].indexOf(step) > index && styles.stepLineActive
          ]} />}
        </View>
      ))}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XCircle size={28} color={Colors.light.textSecondary} />
            </TouchableOpacity>
            {renderStepIndicator()}
          </View>

          {step === 'form' && renderFormStep()}
          {step === 'summary' && renderSummaryStep()}
          {step === 'signature' && renderSignatureStep()}
          {step === 'complete' && renderCompleteStep()}

          <View style={styles.footer}>
            {step !== 'form' && step !== 'complete' && (
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => setStep(step === 'summary' ? 'form' : 'summary')}
              >
                <Text style={styles.backButtonText}>Atrás</Text>
              </TouchableOpacity>
            )}
            
            {step === 'form' && (
              <TouchableOpacity style={styles.primaryButton} onPress={handleContinueToSummary}>
                <Text style={styles.primaryButtonText}>Continuar</Text>
              </TouchableOpacity>
            )}
            
            {step === 'summary' && (
              <TouchableOpacity style={styles.primaryButton} onPress={handleContinueToSignature}>
                <Text style={styles.primaryButtonText}>Firmar</Text>
              </TouchableOpacity>
            )}
            
            {step === 'signature' && (
              <TouchableOpacity style={styles.primaryButton} onPress={handleConfirmSignature}>
                <CheckCircle size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Confirmar Firma</Text>
              </TouchableOpacity>
            )}
            
            {step === 'complete' && (
              <TouchableOpacity style={styles.primaryButton} onPress={handleComplete}>
                <Text style={styles.primaryButtonText}>Finalizar y Continuar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
      
      {renderFullConsentModal()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '95%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  closeButton: {
    padding: 4,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  stepDot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.border,
  },
  dotActive: {
    backgroundColor: Colors.light.primary,
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: Colors.light.border,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: Colors.light.primary,
  },
  stepContent: {
    flex: 1,
    padding: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    backgroundColor: 'transparent',
  },
  speakButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  speakButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  speakButtonTextActive: {
    color: '#FFFFFF',
  },
  formSection: {
    gap: 16,
    marginBottom: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  input: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 20,
  },
  userDataCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dataLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  consentSummaryCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  consentPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  consentPointText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  viewFullConsentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  viewFullConsentText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  signatureContainer: {
    marginBottom: 16,
  },
  signatureLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  signatureCanvas: {
    width: SIGNATURE_WIDTH,
    height: SIGNATURE_HEIGHT,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  signaturePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  signaturePlaceholderText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  signatureLine: {
    position: 'absolute',
    height: 3,
    backgroundColor: '#1F2937',
    borderRadius: 1.5,
    transformOrigin: 'left center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
  },
  clearButtonText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  rgpdContactBlock: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 6,
  },
  rgpdContactTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  rgpdContactLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rgpdContactLineText: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
  },
  rgpdTextBlock: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  rgpdTextBlockTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  rgpdTextScroll: {
    maxHeight: 140,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
  },
  rgpdTextScrollContent: {
    flexGrow: 1,
  },
  rgpdTextContent: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 20,
    minWidth: 320,
  },
  signatureInfo: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
  },
  signatureInfoText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  completeCard: {
    gap: 12,
    marginBottom: 16,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  exportButtonEmail: {
    backgroundColor: '#3B82F6',
  },
  exportButtonShare: {
    backgroundColor: '#8B5CF6',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  successInfo: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successInfoText: {
    fontSize: 13,
    color: '#166534',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  backButton: {
    flex: 0.4,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  fullConsentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullConsentContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  fullConsentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  fullConsentTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
  },
  fullConsentScroll: {
    padding: 20,
    maxHeight: 500,
  },
  fullConsentText: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 22,
  },
});
