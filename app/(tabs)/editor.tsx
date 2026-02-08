import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Plus, Edit, Trash2, Save, X, Upload } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  image: string;
  model3d?: string;
  size?: string;
  color?: string;
  tags?: string[];
};

export default function EditorScreen() {
  const { customCatalog, setCustomCatalog } = useApp();
  const [items, setItems] = useState<ClothingItem[]>(customCatalog?.items || []);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null);
  const [jsonUrl, setJsonUrl] = useState(customCatalog?.url || '');
  
  const [formData, setFormData] = useState<Partial<ClothingItem>>({
    name: '',
    category: 'Camisetas',
    brand: 'ZARA',
    price: 0,
    image: '',
    model3d: '',
    size: '',
    color: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const normalizeItem = (item: any, index: number): ClothingItem | null => {
    try {
      // Handle different field names from various JSON formats
      const id = item.id || item._id || item.sku || item.code || `item_${Date.now()}_${index}`;
      const name = item.name || item.title || item.nombre || item.product_name || 'Sin nombre';
      const category = item.category || item.categoria || item.type || item.tipo || 'General';
      const brand = item.brand || item.marca || item.manufacturer || 'Sin marca';
      const price = parseFloat(item.price || item.precio || item.cost || item.pvp || 0) || 0;
      const image = item.image || item.imagen || item.img || item.photo || item.thumbnail || item.image_url || '';
      
      // Skip items without image
      if (!image) {
        console.log('Skipping item without image:', name);
        return null;
      }

      return {
        id: String(id),
        name: String(name),
        category: String(category),
        brand: String(brand),
        price: Number(price),
        image: String(image),
        model3d: item.model3d || item.model || item.modelo3d || undefined,
        size: item.size || item.talla || item.sizes?.[0] || undefined,
        color: item.color || item.colours?.[0] || undefined,
        tags: Array.isArray(item.tags) ? item.tags : (item.etiquetas ? [item.etiquetas] : undefined),
      };
    } catch (e) {
      console.error('Error normalizing item:', e, item);
      return null;
    }
  };

  const loadFromUrl = async () => {
    if (!jsonUrl.trim()) {
      Alert.alert('Error', 'Ingresa una URL válida');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Editor: Loading catalog from URL:', jsonUrl);
      const response = await fetch(jsonUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      console.log('Editor: Received response length:', text.length);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error('El archivo no es un JSON válido');
      }
      
      // Handle different JSON structures
      let rawItems: any[] = [];
      
      if (data.catalog && Array.isArray(data.catalog)) {
        rawItems = data.catalog;
      } else if (data.items && Array.isArray(data.items)) {
        rawItems = data.items;
      } else if (data.products && Array.isArray(data.products)) {
        rawItems = data.products;
      } else if (data.prendas && Array.isArray(data.prendas)) {
        rawItems = data.prendas;
      } else if (data.data && Array.isArray(data.data)) {
        rawItems = data.data;
      } else if (Array.isArray(data)) {
        rawItems = data;
      } else {
        // Try to find any array property
        const arrayProps = Object.keys(data).filter(key => Array.isArray(data[key]));
        if (arrayProps.length > 0) {
          rawItems = data[arrayProps[0]];
          console.log('Editor: Found items in property:', arrayProps[0]);
        } else {
          throw new Error('No se encontró un array de prendas en el JSON');
        }
      }
      
      console.log('Editor: Raw items found:', rawItems.length);
      
      // Normalize and validate all items
      const normalizedItems = rawItems
        .map((item, index) => normalizeItem(item, index))
        .filter((item): item is ClothingItem => item !== null);
      
      console.log('Editor: Normalized items:', normalizedItems.length);
      
      if (normalizedItems.length === 0) {
        throw new Error('No se encontraron prendas válidas en el catálogo');
      }
      
      setItems(normalizedItems);
      
      // Save to AppContext so Catalog can use it
      await setCustomCatalog(jsonUrl, normalizedItems);
      
      Alert.alert('Éxito', `${normalizedItems.length} prendas cargadas y sincronizadas con el catálogo`);
      
    } catch (error) {
      console.error('Editor: Error loading catalog:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert('Error', `No se pudo cargar el catálogo:\n${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'Camisetas',
      brand: 'ZARA',
      price: 0,
      image: '',
      model3d: '',
      size: '',
      color: '',
    });
    setShowModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const openEditModal = (item: ClothingItem) => {
    setEditingItem(item);
    setFormData(item);
    setShowModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const saveItem = () => {
    if (!formData.name || !formData.brand || !formData.image) {
      Alert.alert('Error', 'Completa los campos obligatorios: nombre, marca e imagen');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const newItem: ClothingItem = {
      id: editingItem?.id || Date.now().toString(),
      name: formData.name || '',
      category: formData.category || 'Camisetas',
      brand: formData.brand || 'ZARA',
      price: formData.price || 0,
      image: formData.image || '',
      model3d: formData.model3d,
      size: formData.size,
      color: formData.color,
      tags: formData.tags,
    };

    if (editingItem) {
      setItems(prev => prev.map(item => item.id === editingItem.id ? newItem : item));
    } else {
      setItems(prev => [...prev, newItem]);
    }

    setShowModal(false);
  };

  const deleteItem = (id: string) => {
    Alert.alert(
      'Confirmar',
      '¿Eliminar esta prenda?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            setItems(prev => prev.filter(item => item.id !== id));
          },
        },
      ]
    );
  };

  const exportJson = () => {
    const json = JSON.stringify({ catalog: items }, null, 2);
    Alert.alert(
      'JSON Exportado',
      'Copia este JSON y guárdalo en un archivo .json:',
      [{ text: 'OK' }]
    );
    console.log('EXPORT JSON:', json);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Editor de Catálogo</Text>
        <Text style={styles.headerSubtitle}>{items.length} prendas</Text>
      </View>

      <View style={styles.urlSection}>
        <TextInput
          style={styles.urlInput}
          placeholder="https://tudominio.com/catalog.json"
          value={jsonUrl}
          onChangeText={setJsonUrl}
          placeholderTextColor={Colors.light.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity 
          style={[styles.loadButton, isLoading && styles.loadButtonDisabled]} 
          onPress={loadFromUrl}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.loadButtonText}>Cargar</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Añadir Prenda</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportButton} onPress={exportJson}>
          <Save size={20} color={Colors.light.primary} />
          <Text style={styles.exportButtonText}>Exportar JSON</Text>
        </TouchableOpacity>
      </View>

      {customCatalog && (
        <View style={styles.syncBadge}>
          <Upload size={14} color="#10B981" />
          <Text style={styles.syncBadgeText}>
            Sincronizado con catálogo ({customCatalog.items.length} prendas)
          </Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay prendas</Text>
            <Text style={styles.emptySubtext}>Añade prendas o carga desde URL</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map(item => (
              <View key={item.id} style={styles.itemCard}>
                <Image 
                  source={{ uri: item.image }} 
                  style={styles.itemImage}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemBrand}>{item.brand}</Text>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemCategory}>{item.category}</Text>
                  <Text style={styles.itemPrice}>{item.price.toFixed(2)}€</Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => openEditModal(item)}
                  >
                    <Edit size={18} color={Colors.light.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => deleteItem(item.id)}
                  >
                    <Trash2 size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Editar Prenda' : 'Nueva Prenda'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Ej: Camiseta Básica"
                placeholderTextColor={Colors.light.textSecondary}
              />

              <Text style={styles.label}>Marca *</Text>
              <TextInput
                style={styles.input}
                value={formData.brand}
                onChangeText={(text) => setFormData(prev => ({ ...prev, brand: text }))}
                placeholder="Ej: ZARA"
                placeholderTextColor={Colors.light.textSecondary}
              />

              <Text style={styles.label}>Categoría</Text>
              <TextInput
                style={styles.input}
                value={formData.category}
                onChangeText={(text) => setFormData(prev => ({ ...prev, category: text }))}
                placeholder="Ej: Camisetas"
                placeholderTextColor={Colors.light.textSecondary}
              />

              <Text style={styles.label}>Precio</Text>
              <TextInput
                style={styles.input}
                value={formData.price?.toString() || '0'}
                onChangeText={(text) => setFormData(prev => ({ ...prev, price: parseFloat(text) || 0 }))}
                placeholder="19.95"
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.light.textSecondary}
              />

              <Text style={styles.label}>URL Imagen *</Text>
              <TextInput
                style={styles.input}
                value={formData.image}
                onChangeText={(text) => setFormData(prev => ({ ...prev, image: text }))}
                placeholder="https://..."
                placeholderTextColor={Colors.light.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>URL Modelo 3D (opcional)</Text>
              <TextInput
                style={styles.input}
                value={formData.model3d}
                onChangeText={(text) => setFormData(prev => ({ ...prev, model3d: text }))}
                placeholder="https://.../model.glb"
                placeholderTextColor={Colors.light.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Talla (opcional)</Text>
              <TextInput
                style={styles.input}
                value={formData.size}
                onChangeText={(text) => setFormData(prev => ({ ...prev, size: text }))}
                placeholder="M"
                placeholderTextColor={Colors.light.textSecondary}
              />

              <Text style={styles.label}>Color (opcional)</Text>
              <TextInput
                style={styles.input}
                value={formData.color}
                onChangeText={(text) => setFormData(prev => ({ ...prev, color: text }))}
                placeholder="Azul"
                placeholderTextColor={Colors.light.textSecondary}
              />

              <TouchableOpacity style={styles.saveButton} onPress={saveItem}>
                <Save size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  urlSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  urlInput: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: Colors.light.text,
  },
  loadButton: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  loadButtonDisabled: {
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
  },
  syncBadgeText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#10B981',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 8,
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemBrand: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600' as const,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  itemCategory: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: Colors.light.primary,
  },
  itemActions: {
    gap: 8,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    height: 48,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    marginTop: 24,
    marginBottom: 20,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
});
