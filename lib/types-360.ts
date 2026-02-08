// Types for 360º TryOn functionality
// Adapted from Orchids types

export interface UserPhoto {
  id: string;
  dataUrl: string;
  timestamp: string;
  angle: 'front' | 'side' | 'back';
  measurements?: BodyMeasurements;
}

export interface BodyMeasurements {
  shoulderWidth: number;
  torsoLength: number;
  armLength: number;
  legLength: number;
  hipWidth: number;
  chestWidth: number;
  height: number;
  confidence: number;
}

export interface ClothingItem360 {
  id: string;
  name: string;
  category: 'tops' | 'bottoms' | 'accessory';
  brand: string;
  price: number;
  image: string;
  tryOnImage?: string;
  model3d?: string;
  size?: string;
  color?: string;
  tags?: string[];
  availableColors?: string[];
  recommendedSize?: string;
  compositeImage?: string;
}
