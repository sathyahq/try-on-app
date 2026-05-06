// Auto-positioning presets per garment type.
// All values are normalized (0..1) relative to the customer photo dimensions.
// `x`, `y` are the top-left of the garment bounding box. `width` is normalized width.
// `rotation` is in degrees.

export const GARMENT_TYPES = [
  {
    id: 'saree',
    label: 'Saree',
    description: 'Drapes diagonally from the left shoulder',
    icon: 'saree',
    preset: { x: 0.10, y: 0.15, width: 0.80, rotation: -5 },
  },
  {
    id: 'churidar',
    label: 'Churidar / Kurti',
    description: 'Centered on the torso, shoulders to hips',
    icon: 'kurti',
    preset: { x: 0.225, y: 0.15, width: 0.55, rotation: 0 },
  },
  {
    id: 'tshirt',
    label: 'T-Shirt / Shirt',
    description: 'Centered on the upper torso',
    icon: 'tshirt',
    preset: { x: 0.25, y: 0.18, width: 0.50, rotation: 0 },
  },
  {
    id: 'lehenga',
    label: 'Lehenga / Skirt',
    description: 'Positioned from waist downward',
    icon: 'lehenga',
    preset: { x: 0.20, y: 0.45, width: 0.60, rotation: 0 },
  },
  {
    id: 'full',
    label: 'Full Outfit',
    description: 'Shoulder to knee',
    icon: 'full',
    preset: { x: 0.225, y: 0.15, width: 0.55, rotation: 0 },
  },
];

export const getGarmentType = (id) =>
  GARMENT_TYPES.find((g) => g.id === id) || GARMENT_TYPES[0];

// Convert a normalized preset into pixel-space position+scale anchored on the
// CENTER of the garment, given the customer photo dimensions and the natural
// (intrinsic) garment dimensions.
export function presetToTransform(preset, photoSize, garmentNatural) {
  const targetWidth = preset.width * photoSize.w;
  const scale = targetWidth / garmentNatural.w;
  const targetHeight = garmentNatural.h * scale;

  const cx = preset.x * photoSize.w + targetWidth / 2;
  const cy = preset.y * photoSize.h + targetHeight / 2;

  return {
    cx,
    cy,
    scale,
    rotation: preset.rotation || 0,
  };
}
