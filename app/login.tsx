import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Platform, Alert, KeyboardAvoidingView, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';
import { Lock, CheckCircle, XCircle } from 'lucide-react-native';
import GDPRConsentForm, { type RGPDContactInfo } from '@/components/GDPRConsentForm';
import BootVideo360 from '@/components/BootVideo360';
import { useApp } from '@/contexts/AppContext';
import { RGPD_CONFIG_KEY, RGPD_TEXT_KEY } from '@/constants/rgpd';

// Cambia esta contraseña por una segura
const ACCESS_PASSWORD = 'EspejoGV360!2024#';

export default function LoginScreen() {
  const router = useRouter();
  const { updateUserProfile, scanData } = useApp();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showGDPRModal, setShowGDPRModal] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [rgpdContact, setRgpdContact] = useState<RGPDContactInfo | undefined>();
  const [rgpdConsentText, setRgpdConsentText] = useState('');
  const [showBootAfterGdpr, setShowBootAfterGdpr] = useState(false);

  const loadRgpdForConsent = useCallback(async () => {
    try {
      const [configRaw, textRaw] = await Promise.all([
        AsyncStorage.getItem(RGPD_CONFIG_KEY),
        AsyncStorage.getItem(RGPD_TEXT_KEY),
      ]);
      if (configRaw) {
        const data = JSON.parse(configRaw);
        setRgpdContact({
          email: data.email,
          telefono: data.telefono,
          direccion: data.direccion,
          responsable: data.responsable,
        });
      } else {
        setRgpdContact(undefined);
      }
      setRgpdConsentText(textRaw ?? '');
    } catch {
      setRgpdContact(undefined);
      setRgpdConsentText('');
    }
  }, []);

  useEffect(() => {
    // Verificar si ya está autenticado y aceptó términos
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const authenticated = localStorage.getItem('espejo_authenticated') === 'true';
      const termsAccepted = localStorage.getItem('espejo_terms_accepted') === 'true';
      const gdprConsent = localStorage.getItem('espejo_gdpr_accepted') === 'true';
      if (authenticated && termsAccepted && gdprConsent) {
        router.replace('/(tabs)/home');
      } else if (!termsAccepted) {
        setShowPrivacyModal(true);
      } else if (!gdprConsent) {
        setPrivacyAccepted(true);
        setShowGDPRModal(true);
      } else {
        setPrivacyAccepted(true);
        setGdprAccepted(true);
      }
    } else {
      // En móvil, verificar si aceptó términos
      const checkTerms = async () => {
        try {
          const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
          const termsAccepted = await AsyncStorage.getItem('espejo_terms_accepted');
          const gdprConsent = await AsyncStorage.getItem('espejo_gdpr_accepted');
          if (termsAccepted === 'true' && gdprConsent === 'true') {
            router.replace('/(tabs)/home');
          } else if (termsAccepted !== 'true') {
            setShowPrivacyModal(true);
          } else {
            setPrivacyAccepted(true);
            setShowGDPRModal(true);
          }
        } catch (error) {
          console.error('Error checking terms:', error);
          setShowPrivacyModal(true);
        }
      };
      checkTerms();
    }
  }, [router]);

  useEffect(() => {
    if (showGDPRModal) loadRgpdForConsent();
  }, [showGDPRModal, loadRgpdForConsent]);

  const handleAcceptPrivacy = async () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem('espejo_terms_accepted', 'true');
      } else {
        const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
        await AsyncStorage.setItem('espejo_terms_accepted', 'true');
      }
      setPrivacyAccepted(true);
      setShowPrivacyModal(false);
      
      loadRgpdForConsent();
      setShowGDPRModal(true);
    } catch (error) {
      console.error('Error saving terms acceptance:', error);
      Alert.alert('Error', 'No se pudieron guardar las preferencias');
    }
  };

  const handleGDPRConsent = async (userData: { firstName: string; lastName: string; email: string }, signatureData: string) => {
    try {
      console.log('GDPR consent received:', userData.email);
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem('espejo_gdpr_accepted', 'true');
        localStorage.setItem('espejo_user_data', JSON.stringify(userData));
        localStorage.setItem('espejo_gdpr_signature', signatureData);
      } else {
        const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
        await AsyncStorage.setItem('espejo_gdpr_accepted', 'true');
        await AsyncStorage.setItem('espejo_user_data', JSON.stringify(userData));
        await AsyncStorage.setItem('espejo_gdpr_signature', signatureData);
      }
      
      // Sync GDPR data to user profile, including avatar from scanner if available
      const profileUpdate: { firstName: string; lastName: string; email: string; name: string; avatar?: string } = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`,
      };
      
      // Use the first scanner photo as profile avatar if available
      if (scanData?.photos && scanData.photos.length > 0) {
        profileUpdate.avatar = scanData.photos[0];
        console.log('Setting profile avatar from first scanner photo');
      }
      
      await updateUserProfile(profileUpdate);
      console.log('Profile synced with GDPR data');
      
      setGdprAccepted(true);
      setShowGDPRModal(false);
      // Mostrar boot (boot-video.mp4) cada vez que se completa el consentimiento RGPD; al terminar ir a home
      setShowBootAfterGdpr(true);
    } catch (error) {
      console.error('Error saving GDPR consent:', error);
      Alert.alert('Error', 'No se pudo guardar el consentimiento');
    }
  };

  const handleGDPRClose = () => {
    // User closed GDPR without completing - show warning
    Alert.alert(
      'Consentimiento RGPD Requerido',
      'Debes completar el formulario de consentimiento RGPD para usar la aplicación.',
      [{ text: 'Entendido', onPress: () => setShowGDPRModal(true) }]
    );
  };

  const handleRejectPrivacy = () => {
    Alert.alert(
      'Términos requeridos',
      'Debes aceptar los términos y condiciones de privacidad para usar la aplicación.',
      [{ text: 'Entendido' }]
    );
  };

  const handleLogin = () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Por favor ingresa la contraseña');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      if (password === ACCESS_PASSWORD) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          localStorage.setItem('espejo_authenticated', 'true');
          localStorage.setItem('espejo_auth_time', Date.now().toString());
        }
        
        setIsLoading(false);
        router.replace('/(tabs)/home');
      } else {
        setIsLoading(false);
        Alert.alert('Error', 'Contraseña incorrecta');
        setPassword('');
      }
    }, 300);
  };

  // Boot (boot-video.mp4) cada vez que se completa el consentimiento RGPD; al terminar ir a home
  if (showBootAfterGdpr) {
    return (
      <BootVideo360
        visible={true}
        onFinish={() => {
          setShowBootAfterGdpr(false);
          router.replace('/(tabs)/home');
        }}
        isScreensaver={false}
      />
    );
  }

  return (
    <>
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {}}
      >
        <View style={styles.modalContainer}>
          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
          >
            <Text style={styles.modalTitle}>Términos y Condiciones de Privacidad</Text>
            
            <View style={styles.termsContainer}>
              <Text style={styles.termsSection}>1. ACEPTACIÓN DE TÉRMINOS</Text>
              <Text style={styles.termsText}>
                Al usar esta aplicación, aceptas cumplir con estos términos y condiciones. Si no estás de acuerdo, no podrás usar la aplicación.
              </Text>

              <Text style={styles.termsSection}>2. USO DE LA APLICACIÓN</Text>
              <Text style={styles.termsText}>
                Esta aplicación de espejo virtual te permite probar ropa virtualmente, escanear prendas y gestionar tu catálogo personal.
              </Text>

              <Text style={styles.termsSection}>3. PRIVACIDAD Y DATOS</Text>
              <Text style={styles.termsText}>
                • Tus fotos y medidas se almacenan localmente en tu dispositivo{"\n"}
                • No compartimos tu información con terceros{"\n"}
                • Puedes eliminar tus datos en cualquier momento desde tu perfil{"\n"}
                • Las imágenes procesadas con IA se envían a servicios externos solo durante el procesamiento
              </Text>

              <Text style={styles.termsSection}>4. PERMISOS</Text>
              <Text style={styles.termsText}>
                La aplicación requiere acceso a:{"\n"}
                • Cámara: para capturar fotos y escanear prendas{"\n"}
                • Galería: para cargar imágenes existentes{"\n"}
                • Almacenamiento: para guardar tu catálogo y configuración{"\n"}
                • Micrófono: para comandos de voz (opcional)
              </Text>

              <Text style={styles.termsSection}>5. RESPONSABILIDAD</Text>
              <Text style={styles.termsText}>
                Los resultados del espejo virtual son aproximaciones. No garantizamos la precisión exacta de las tallas sugeridas.
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.rejectButton}
                onPress={handleRejectPrivacy}
              >
                <XCircle size={24} color="#fff" />
                <Text style={styles.rejectButtonText}>Rechazar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={handleAcceptPrivacy}
              >
                <CheckCircle size={24} color="#fff" />
                <Text style={styles.acceptButtonText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <GDPRConsentForm
        visible={showGDPRModal}
        onClose={handleGDPRClose}
        onConsent={handleGDPRConsent}
        rgpdContact={rgpdContact}
        rgpdConsentText={rgpdConsentText}
      />

      {privacyAccepted && gdprAccepted && (
        <KeyboardAvoidingView 
          style={styles.container}
          behavior="padding"
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Lock size={64} color={Colors.light.primary} />
            </View>
            
            <Text style={styles.title}>Acceso Restringido</Text>
            <Text style={styles.subtitle}>
              Esta aplicación es privada. Ingresa la contraseña para continuar.
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleLogin}
                autoFocus
                editable={!isLoading}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Verificando...' : 'Entrar'}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.hint}>
              Solo personas autorizadas pueden acceder
            </Text>
          </View>
        </KeyboardAvoidingView>
      )}

      {!showPrivacyModal && !privacyAccepted && (
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Lock size={64} color={Colors.light.primary} />
            </View>
            <Text style={styles.title}>Cargando...</Text>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: Colors.light.primary + '15',
    borderRadius: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  termsContainer: {
    marginBottom: 24,
  },
  termsSection: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  termsText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.error,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.success,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

