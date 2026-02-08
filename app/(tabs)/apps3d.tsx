import { useMemo, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions } from 'react-native';
import { BarChart3, TrendingUp, Heart, Share2, Shirt, Award, DollarSign, Calendar, Target } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useVoice } from '@/contexts/VoiceContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function AnalyticsScreen() {
  const { getPreferenceStats, triedItems } = useApp();
  const { registerCommand, unregisterCommand } = useVoice();
  const scrollViewRef = useRef<ScrollView>(null);
  const stats = useMemo(() => getPreferenceStats(), [getPreferenceStats]);

  const topCategories = useMemo(() => {
    return Object.entries(stats.favoriteCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  }, [stats.favoriteCategories]);

  const topBrands = useMemo(() => {
    return Object.entries(stats.favoriteBrands)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  }, [stats.favoriteBrands]);

  const recentActivity = useMemo(() => {
    const lastWeek = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return triedItems.filter(item => 
      new Date(item.date).getTime() > lastWeek
    ).length;
  }, [triedItems]);

  const maxCategoryValue = useMemo(() => {
    return Math.max(...Object.values(stats.favoriteCategories), 1);
  }, [stats.favoriteCategories]);

  useFocusEffect(
    useCallback(() => {
      const scrollUpId = `scroll-up-analytics-${Date.now()}`;
      const scrollDownId = `scroll-down-analytics-${Date.now()}`;

      registerCommand(scrollUpId, {
        patterns: ['subir', 'arriba', 'scroll arriba', 'desplazar arriba'],
        action: () => {
          console.log('Analytics: Scrolling up');
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        },
        description: 'subiendo',
      });

      registerCommand(scrollDownId, {
        patterns: ['bajar', 'abajo', 'scroll abajo', 'desplazar abajo'],
        action: () => {
          console.log('Analytics: Scrolling down');
          scrollViewRef.current?.scrollToEnd({ animated: true });
        },
        description: 'bajando',
      });

      return () => {
        unregisterCommand(scrollUpId);
        unregisterCommand(scrollDownId);
      };
    }, [registerCommand, unregisterCommand])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BarChart3 size={32} color={Colors.light.primary} />
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSubtitle}>Tu actividad y preferencias</Text>
      </View>

      <ScrollView ref={scrollViewRef} style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { width: CARD_WIDTH }]}>
            <View style={styles.statIcon}>
              <Shirt size={24} color={Colors.light.primary} />
            </View>
            <Text style={styles.statValue}>{stats.totalTries}</Text>
            <Text style={styles.statLabel}>Prendas Probadas</Text>
          </View>

          <View style={[styles.statCard, { width: CARD_WIDTH }]}>
            <View style={styles.statIcon}>
              <Heart size={24} color="#FF006E" />
            </View>
            <Text style={styles.statValue}>{stats.totalFavorites}</Text>
            <Text style={styles.statLabel}>Favoritos</Text>
          </View>

          <View style={[styles.statCard, { width: CARD_WIDTH }]}>
            <View style={styles.statIcon}>
              <Share2 size={24} color="#00D9FF" />
            </View>
            <Text style={styles.statValue}>{stats.totalShared}</Text>
            <Text style={styles.statLabel}>Compartidos</Text>
          </View>

          <View style={[styles.statCard, { width: CARD_WIDTH }]}>
            <View style={styles.statIcon}>
              <Calendar size={24} color="#FFB800" />
            </View>
            <Text style={styles.statValue}>{recentActivity}</Text>
            <Text style={styles.statLabel}>Esta Semana</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={20} color={Colors.light.primary} />
            <Text style={styles.sectionTitle}>Rango de Precios</Text>
          </View>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Mínimo:</Text>
              <Text style={styles.priceValue}>{stats.priceRange.min === Infinity ? '0.00' : stats.priceRange.min.toFixed(2)}€</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Promedio:</Text>
              <Text style={styles.priceValue}>{stats.priceRange.avg.toFixed(2)}€</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Máximo:</Text>
              <Text style={styles.priceValue}>{stats.priceRange.max.toFixed(2)}€</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={Colors.light.primary} />
            <Text style={styles.sectionTitle}>Categorías Favoritas</Text>
          </View>
          <View style={styles.chartContainer}>
            {topCategories.length > 0 ? (
              topCategories.map(([category, count], index) => {
                const percentage = (count / maxCategoryValue) * 100;
                return (
                  <View key={category} style={styles.barItem}>
                    <Text style={styles.barLabel}>{category}</Text>
                    <View style={styles.barContainer}>
                      <View 
                        style={[
                          styles.barFill, 
                          { 
                            width: `${percentage}%`,
                            backgroundColor: index === 0 ? Colors.light.primary : index === 1 ? '#00D9FF' : '#FFB800'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.barCount}>{count}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>Aún no has probado prendas</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={20} color={Colors.light.primary} />
            <Text style={styles.sectionTitle}>Marcas Preferidas</Text>
          </View>
          <View style={styles.brandsContainer}>
            {topBrands.length > 0 ? (
              topBrands.map(([brand, count], index) => (
                <View 
                  key={brand} 
                  style={[
                    styles.brandChip,
                    { 
                      backgroundColor: index === 0 ? `${Colors.light.primary}20` : index === 1 ? '#00D9FF20' : '#FFB80020',
                      borderColor: index === 0 ? Colors.light.primary : index === 1 ? '#00D9FF' : '#FFB800'
                    }
                  ]}
                >
                  <Text style={[
                    styles.brandName,
                    { color: index === 0 ? Colors.light.primary : index === 1 ? '#00D9FF' : '#FFB800' }
                  ]}>
                    {brand}
                  </Text>
                  <View style={[
                    styles.brandBadge,
                    { backgroundColor: index === 0 ? Colors.light.primary : index === 1 ? '#00D9FF' : '#FFB800' }
                  ]}>
                    <Text style={styles.brandBadgeText}>{count}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Explora el catálogo para empezar</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color={Colors.light.primary} />
            <Text style={styles.sectionTitle}>Insights</Text>
          </View>
          <View style={styles.insightsContainer}>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Presupuesto Promedio</Text>
              <Text style={styles.insightValue}>{stats.priceRange.avg.toFixed(2)}€</Text>
            </View>
            {topCategories.length > 0 && (
              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Categoría Favorita</Text>
                <Text style={styles.insightValue}>{topCategories[0][0]}</Text>
              </View>
            )}
            {topBrands.length > 0 && (
              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Marca Favorita</Text>
                <Text style={styles.insightValue}>{topBrands[0][0]}</Text>
              </View>
            )}
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Tasa de Compartidos</Text>
              <Text style={styles.insightValue}>
                {stats.totalTries > 0 ? Math.round((stats.totalShared / stats.totalTries) * 100) : 0}%
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A0A0F',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#1A1A24',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  priceCard: {
    backgroundColor: '#1A1A24',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.light.primary,
  },
  chartContainer: {
    backgroundColor: '#1A1A24',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  barItem: {
    gap: 8,
  },
  barLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  barContainer: {
    height: 28,
    backgroundColor: '#2A2A3A',
    borderRadius: 14,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  barCount: {
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#9CA3AF',
  },
  brandsContainer: {
    backgroundColor: '#1A1A24',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  brandName: {
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandBadgeText: {
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  insightsContainer: {
    gap: 12,
  },
  insightCard: {
    backgroundColor: '#1A1A24',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  insightLabel: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  insightValue: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
