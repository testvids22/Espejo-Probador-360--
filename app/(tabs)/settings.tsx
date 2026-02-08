import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { Settings, Key, Shield, FileText, Download } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { getApiKeysForExpo, saveApiKeysForExpo } from '@/lib/api-keys-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RGPD_CONFIG_KEY, RGPD_TEXT_KEY } from '@/constants/rgpd';
import { useReportActivity } from '@/components/InactivityScreensaver';

const ANDROID_PERMISSIONS_KEY = '@app_android_permissions';

const DEFAULT_ANDROID_PERMISSIONS = [
  'CAMERA',
  'RECORD_AUDIO',
  'android.permission.VIBRATE',
  'READ_EXTERNAL_STORAGE',
  'WRITE_EXTERNAL_STORAGE',
  'INTERNET',
  'READ_MEDIA_IMAGES',
  'READ_MEDIA_VIDEO',
  'READ_MEDIA_AUDIO',
];

type RGPDConfig = {
  email: string;
  telefono: string;
  direccion: string;
  responsable: string;
  updatedAt?: string;
};

const defaultRgpd: RGPDConfig = {
  email: '',
  telefono: '',
  direccion: '',
  responsable: '',
};

export default function SettingsScreen() {
  const reportActivity = useReportActivity();
  const [falKey, setFalKey] = useState('');
  const [replicateToken, setReplicateToken] = useState('');
  const [optionalApiName, setOptionalApiName] = useState('');
  const [optionalApiKey, setOptionalApiKey] = useState('');
  const [androidPermissionsJson, setAndroidPermissionsJson] = useState('');
  const [rgpdEmail, setRgpdEmail] = useState('');
  const [rgpdTelefono, setRgpdTelefono] = useState('');
  const [rgpdDireccion, setRgpdDireccion] = useState('');
  const [rgpdResponsable, setRgpdResponsable] = useState('');
  const [rgpdText, setRgpdText] = useState('');
  const [saved, setSaved] = useState(false);

  const loadApiKeys = useCallback(async () => {
    const keys = await getApiKeysForExpo();
    setFalKey(keys.FAL_KEY && keys.FAL_KEY.length > 20 ? keys.FAL_KEY : '');
    setReplicateToken(keys.REPLICATE_API_TOKEN && keys.REPLICATE_API_TOKEN !== '[NO_CONFIGURADO]' ? keys.REPLICATE_API_TOKEN : '');
    setOptionalApiName(keys.OPTIONAL_API_NAME || '');
    setOptionalApiKey(keys.OPTIONAL_API_KEY || '');
  }, []);

  const loadAndroidPermissions = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(ANDROID_PERMISSIONS_KEY);
      if (raw) {
        setAndroidPermissionsJson(raw);
      } else {
        setAndroidPermissionsJson(JSON.stringify(DEFAULT_ANDROID_PERMISSIONS, null, 2));
      }
    } catch {
      setAndroidPermissionsJson(JSON.stringify(DEFAULT_ANDROID_PERMISSIONS, null, 2));
    }
  }, []);

  const loadRgpd = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(RGPD_CONFIG_KEY);
      if (raw) {
        const data: RGPDConfig = JSON.parse(raw);
        setRgpdEmail(data.email ?? '');
        setRgpdTelefono(data.telefono ?? '');
        setRgpdDireccion(data.direccion ?? '');
        setRgpdResponsable(data.responsable ?? '');
      } else {
        setRgpdEmail(defaultRgpd.email);
        setRgpdTelefono(defaultRgpd.telefono);
        setRgpdDireccion(defaultRgpd.direccion);
        setRgpdResponsable(defaultRgpd.responsable);
      }
      const textRaw = await AsyncStorage.getItem(RGPD_TEXT_KEY);
      setRgpdText(textRaw ?? '');
    } catch {
      setRgpdEmail(defaultRgpd.email);
      setRgpdTelefono(defaultRgpd.telefono);
      setRgpdDireccion(defaultRgpd.direccion);
      setRgpdResponsable(defaultRgpd.responsable);
      setRgpdText('');
    }
  }, []);

  useEffect(() => {
    loadApiKeys();
    loadAndroidPermissions();
    loadRgpd();
  }, [loadApiKeys, loadAndroidPermissions, loadRgpd]);

  useFocusEffect(
    useCallback(() => {
      reportActivity();
    }, [reportActivity])
  );

  const handleSaveApiKeys = async () => {
    await saveApiKeysForExpo(
      falKey.trim() || '[CONFIGURAR_EN_VERCEL]',
      replicateToken.trim() || '[CONFIGURAR_EN_VERCEL]',
      optionalApiName.trim(),
      optionalApiKey.trim()
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (Platform.OS !== 'web') Alert.alert('Guardado', 'Claves API guardadas.');
  };

  const handleSaveAndroidPermissions = async () => {
    try {
      JSON.parse(androidPermissionsJson);
      await AsyncStorage.setItem(ANDROID_PERMISSIONS_KEY, androidPermissionsJson);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (Platform.OS !== 'web') Alert.alert('Guardado', 'Permisos Android guardados (editar app.json manualmente para aplicarlos en build).');
    } catch {
      Alert.alert('Error', 'El JSON de permisos no es válido.');
    }
  };

  const handleSaveRgpd = async () => {
    const data: RGPDConfig = {
      email: rgpdEmail.trim(),
      telefono: rgpdTelefono.trim(),
      direccion: rgpdDireccion.trim(),
      responsable: rgpdResponsable.trim(),
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(RGPD_CONFIG_KEY, JSON.stringify(data, null, 2));
    await AsyncStorage.setItem(RGPD_TEXT_KEY, rgpdText);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (Platform.OS !== 'web') Alert.alert('Guardado', 'Reglamento RGPD actualizado.');
  };

  const handleExportRgpd = async () => {
    const data: RGPDConfig = {
      email: rgpdEmail.trim(),
      telefono: rgpdTelefono.trim(),
      direccion: rgpdDireccion.trim(),
      responsable: rgpdResponsable.trim(),
      updatedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rgpd-config.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      try {
        const isAvailable = await Share.share({
          message: json,
          title: 'rgpd-config.json',
        });
        if (isAvailable.action === Share.sharedAction) {
          Alert.alert('Exportado', 'Configuración RGPD exportada.');
        }
      } catch {
        Alert.alert('Error', 'No se pudo exportar.');
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Settings size={28} color={Colors.light.primary} />
        <Text style={styles.title}>Ajustes</Text>
        <Text style={styles.subtitle}>API Keys, permisos Android y RGPD (se guardan de forma persistente)</Text>
      </View>

      {/* API Keys */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Key size={20} color={Colors.light.primary} />
          <Text style={styles.sectionTitle}>Claves API</Text>
        </View>
        <Text style={styles.hint}>En web puedes usar aquí tus keys; en build se usan .env o Vercel. No se borran al borrar perfil.</Text>
        <Text style={styles.label}>FAL AI (obligatoria para TryOn y 360º)</Text>
        <TextInput
          style={styles.input}
          placeholder="EXPO_PUBLIC_FAL_KEY"
          placeholderTextColor={Colors.light.textSecondary}
          value={falKey}
          onChangeText={setFalKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Text style={styles.label}>Replicate (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="EXPO_PUBLIC_REPLICATE_API_TOKEN"
          placeholderTextColor={Colors.light.textSecondary}
          value={replicateToken}
          onChangeText={setReplicateToken}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Text style={styles.label}>API opcional (ej. Grok, Wan): nombre</Text>
        <TextInput
          style={styles.input}
          placeholder="Grok / Wan / otro"
          placeholderTextColor={Colors.light.textSecondary}
          value={optionalApiName}
          onChangeText={setOptionalApiName}
          autoCapitalize="none"
        />
        <Text style={styles.label}>API opcional: clave</Text>
        <TextInput
          style={styles.input}
          placeholder="Clave de la API opcional"
          placeholderTextColor={Colors.light.textSecondary}
          value={optionalApiKey}
          onChangeText={setOptionalApiKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleSaveApiKeys}>
          <Text style={styles.primaryButtonText}>Guardar claves API</Text>
        </TouchableOpacity>
      </View>

      {/* Permisos Android */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Shield size={20} color={Colors.light.primary} />
          <Text style={styles.sectionTitle}>Permisos Android</Text>
        </View>
        <Text style={styles.hint}>Editable en formato JSON. Para aplicarlos en la app, actualiza app.json y recompila.</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder='["CAMERA","RECORD_AUDIO",...]'
          placeholderTextColor={Colors.light.textSecondary}
          value={androidPermissionsJson}
          onChangeText={setAndroidPermissionsJson}
          multiline
          numberOfLines={8}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleSaveAndroidPermissions}>
          <Text style={styles.primaryButtonText}>Guardar permisos</Text>
        </TouchableOpacity>
      </View>

      {/* RGPD */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <FileText size={20} color={Colors.light.primary} />
          <Text style={styles.sectionTitle}>Reglamento RGPD</Text>
        </View>
        <Text style={styles.label}>Email contacto</Text>
        <TextInput
          style={styles.input}
          placeholder="contacto@empresa.com"
          placeholderTextColor={Colors.light.textSecondary}
          value={rgpdEmail}
          onChangeText={setRgpdEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          placeholder="+34 600 000 000"
          placeholderTextColor={Colors.light.textSecondary}
          value={rgpdTelefono}
          onChangeText={setRgpdTelefono}
          keyboardType="phone-pad"
        />
        <Text style={styles.label}>Dirección</Text>
        <TextInput
          style={styles.input}
          placeholder="Dirección del responsable"
          placeholderTextColor={Colors.light.textSecondary}
          value={rgpdDireccion}
          onChangeText={setRgpdDireccion}
        />
        <Text style={styles.label}>Responsable</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre del responsable del tratamiento"
          placeholderTextColor={Colors.light.textSecondary}
          value={rgpdResponsable}
          onChangeText={setRgpdResponsable}
        />
        <Text style={styles.label}>Texto del reglamento RGPD (scroll lateral si es largo)</Text>
        <ScrollView horizontal style={styles.textScrollWrap} contentContainerStyle={styles.textScrollContent}>
          <TextInput
            style={[styles.input, styles.textArea, styles.rgpdTextArea]}
            placeholder="Introduce aquí el texto completo del reglamento / política de privacidad. Se mostrará en el formulario de consentimiento."
            placeholderTextColor={Colors.light.textSecondary}
            value={rgpdText}
            onChangeText={setRgpdText}
            multiline
            numberOfLines={6}
          />
        </ScrollView>
        <View style={styles.rowButtons}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSaveRgpd}>
            <Text style={styles.primaryButtonText}>Guardar RGPD</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleExportRgpd}>
            <Download size={18} color={Colors.light.primary} />
            <Text style={styles.secondaryButtonText}>Exportar .json</Text>
          </TouchableOpacity>
        </View>
      </View>

      {saved && (
        <View style={styles.savedBadge}>
          <Text style={styles.savedText}>Guardado</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { padding: 20, paddingBottom: 80 },
  header: { marginBottom: 24, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.light.text },
  subtitle: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 4 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text },
  label: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 6 },
  hint: { fontSize: 12, color: Colors.light.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 12,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  textScrollWrap: { maxHeight: 180, marginBottom: 12 },
  textScrollContent: { flexGrow: 1 },
  rgpdTextArea: { minWidth: 400, minHeight: 160 },
  primaryButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: Colors.light.primary },
  rowButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  savedBadge: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#10B981', borderRadius: 20 },
  savedText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
