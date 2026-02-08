import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';

// Auto-navegar a pestaña 360º cuando el video esté listo (funciona desde cualquier pestaña)
export function AutoNavigate360() {
  const router = useRouter();
  const { triedItems } = useApp();
  const hasNavigatedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const itemsWith360 = triedItems.filter(ti => ti.view360?.isReady && !ti.view360?.generating);
    const itemWithReady360 = itemsWith360[itemsWith360.length - 1];
    if (!itemWithReady360) return;
    const itemId = itemWithReady360.item.id;
    if (hasNavigatedRef.current.has(itemId)) return;
    hasNavigatedRef.current.add(itemId);
    const t = setTimeout(() => {
      router.push('/(tabs)/tryon-360');
    }, 800);
    return () => clearTimeout(t);
  }, [triedItems, router]);

  return null;
}
