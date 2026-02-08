import { useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { generateText } from '@rork-ai/toolkit-sdk';
import type { ClothingItem } from './AppContext';

type RecommendationInput = {
  triedItems: ClothingItem[];
  favorites: ClothingItem[];
  currentItem?: ClothingItem;
};

export const [AIProvider, useAI] = createContextHook(() => {
  const generateRecommendations = useCallback(async (input: RecommendationInput): Promise<ClothingItem[]> => {
    try {
      console.log('Generando recomendaciones con IA...');
      
      const categoryCounts: Record<string, number> = {};
      const brandCounts: Record<string, number> = {};
      
      input.triedItems.forEach(item => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 1;
      });

      input.favorites.forEach(item => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 2;
        brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 2;
      });

      const topCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([cat]) => cat);

      const topBrands = Object.entries(brandCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([brand]) => brand);

      console.log('Top categorías:', topCategories);
      console.log('Top marcas:', topBrands);

      return [];
    } catch (error) {
      console.error('Error generando recomendaciones:', error);
      return [];
    }
  }, []);

  const detectBodyPoints = useCallback(async (imageUri: string): Promise<{
    shoulders: number;
    chest: number;
    waist: number;
    hips: number;
  } | null> => {
    try {
      console.log('Analizando puntos corporales con IA...');
      
      const analysisPrompt = `Analiza esta imagen de una persona y estima sus medidas corporales aproximadas en centímetros. 
Devuelve solo 4 números separados por comas en este orden: hombros, pecho, cintura, cadera.
Ejemplo: 45,95,75,95`;

      const result = await generateText({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              { type: 'image', image: imageUri }
            ]
          }
        ]
      });

      console.log('Respuesta IA:', result);

      const numbers = result.match(/\d+/g);
      if (numbers && numbers.length >= 4) {
        return {
          shoulders: parseInt(numbers[0]),
          chest: parseInt(numbers[1]),
          waist: parseInt(numbers[2]),
          hips: parseInt(numbers[3])
        };
      }

      return null;
    } catch (error) {
      console.error('Error detectando puntos corporales:', error);
      return null;
    }
  }, []);

  const suggestSize = useCallback(async (
    bodyMeasurements: { shoulders: number; chest: number; waist: number; hips: number },
    item: ClothingItem
  ): Promise<string> => {
    try {
      console.log('Sugiriendo talla con IA...');

      const chest = bodyMeasurements.chest;
      const waist = bodyMeasurements.waist;

      if (item.category === 'Camisetas' || item.category === 'Camisas') {
        if (chest < 85) return 'XS';
        if (chest < 95) return 'S';
        if (chest < 105) return 'M';
        if (chest < 115) return 'L';
        return 'XL';
      }

      if (item.category === 'Pantalones') {
        if (waist < 70) return 'XS';
        if (waist < 80) return 'S';
        if (waist < 90) return 'M';
        if (waist < 100) return 'L';
        return 'XL';
      }

      if (chest < 90) return 'S';
      if (chest < 100) return 'M';
      return 'L';
    } catch (error) {
      console.error('Error sugiriendo talla:', error);
      return 'M';
    }
  }, []);

  return {
    generateRecommendations,
    detectBodyPoints,
    suggestSize,
  };
});
