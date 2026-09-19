import { z } from 'zod';

export const contentId = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be kebab-case')
  .min(2)
  .max(40);

export const localizedText = z.object({
  es: z.string().trim().min(1),
  en: z.string().trim().min(1).optional(),
});

export type LocalizedText = z.infer<typeof localizedText>;

export const latLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type LatLng = z.infer<typeof latLng>;

export const area = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusMeters: z.number().min(100),
});

export type Area = z.infer<typeof area>;

export const imageRef = z
  .object({
    locationId: contentId,
    usage: z.enum(['thumb', 'detail', 'extra']),
    index: z.number().int().min(0).optional(),
    alt: localizedText,
    aspectRatio: z.number().positive().optional(),
    credit: z.string().optional(),
  })
  .refine((ref) => ref.usage !== 'extra' || ref.index !== undefined, {
    message: 'index is required when usage is "extra"',
    path: ['index'],
  });

export type ImageRef = z.infer<typeof imageRef>;

export const tag = z.object({
  id: contentId,
  label: localizedText,
});

export type Tag = z.infer<typeof tag>;

export const tipCategory = z.object({
  id: contentId,
  label: localizedText,
});

export type TipCategory = z.infer<typeof tipCategory>;

export const neighbourhood = z.object({
  id: contentId,
  name: localizedText,
  description: localizedText.optional(),
});

export type Neighbourhood = z.infer<typeof neighbourhood>;

export const captureSettings = z.object({
  camera: z.string().optional(),
  focalLengthMm: z.number().positive().optional(),
  aperture: z.string().optional(),
  shutterSpeed: z.string().optional(),
  iso: z.number().int().positive().optional(),
});

export type CaptureSettings = z.infer<typeof captureSettings>;

export const accessPolicy = z.object({
  premiumFields: z.array(z.string()),
});

export type AccessPolicy = z.infer<typeof accessPolicy>;

export const location = z.object({
  id: contentId,
  name: localizedText,
  neighbourhoodId: contentId,
  tagIds: z.array(contentId),
  approximateArea: area,
  // Ausente o no reconocido se normaliza a "premium" (FR-030); nunca invalida la pieza.
  access: z.preprocess(
    (value) => (value === 'free' ? 'free' : 'premium'),
    z.enum(['free', 'premium']),
  ),
  thumbnail: imageRef,
  coords: latLng,
  bestTime: localizedText.optional(),
  shotDescription: localizedText,
  capture: captureSettings.optional(),
  detailImage: imageRef,
  extraImages: z.array(imageRef).optional(),
});

export type Location = z.infer<typeof location>;

export const tip = z.object({
  id: contentId,
  categoryId: contentId,
  title: localizedText,
  context: localizedText.optional(),
  body: z.array(localizedText).min(1),
  relatedLocationIds: z.array(contentId).optional(),
});

export type Tip = z.infer<typeof tip>;

export const catalog = z.object({
  schemaVersion: z.number().int().min(1),
  updatedAt: z.iso.date(),
  locales: z.array(z.string()).min(1),
  access: accessPolicy,
  tags: z.array(tag).min(1),
  tipCategories: z.array(tipCategory).min(1),
  neighbourhoods: z.array(neighbourhood),
  locations: z.array(location),
  tips: z.array(tip),
});

export type Catalog = z.infer<typeof catalog>;
