// Auto-positioning presets per garment type.
// All values are normalized (0..1) relative to the customer photo dimensions.
// `cx`, `cy` are the CENTER of the garment in normalized coordinates.
// `width` is the garment's normalized width. `rotation` is in degrees.
//
// We anchor on the center (rather than top-left) so the same preset works
// reasonably whether the customer photo is a full-body shot or a tight
// head-and-shoulders selfie — staff just slide it up or down a bit.

export const GARMENT_TYPES = [
  {
    id: 'saree',
    label: 'Saree',
    description: 'Drapes diagonally from the left shoulder',
    icon: 'saree',
    preset: { cx: 0.50, cy: 0.62, width: 0.85, rotation: -5 },
  },
  {
    id: 'churidar',
    label: 'Churidar / Kurti',
    description: 'Centered on the torso, shoulders to hips',
    icon: 'kurti',
    preset: { cx: 0.50, cy: 0.62, width: 0.70, rotation: 0 },
  },
  {
    id: 'tshirt',
    label: 'T-Shirt / Shirt',
    description: 'Centered on the upper torso',
    icon: 'tshirt',
    preset: { cx: 0.50, cy: 0.60, width: 0.65, rotation: 0 },
  },
  {
    id: 'lehenga',
    label: 'Lehenga / Skirt',
    description: 'Positioned from waist downward',
    icon: 'lehenga',
    preset: { cx: 0.50, cy: 0.78, width: 0.75, rotation: 0 },
  },
  {
    id: 'full',
    label: 'Full Outfit',
    description: 'Shoulder to knee',
    icon: 'full',
    preset: { cx: 0.50, cy: 0.62, width: 0.70, rotation: 0 },
  },
];

export const getGarmentType = (id) =>
  GARMENT_TYPES.find((g) => g.id === id) || GARMENT_TYPES[0];

// Convert a normalized preset into pixel-space transform.
// Now that the garment image is tight-cropped to its alpha bounds, the
// "width" preset corresponds to the visible garment width as a fraction of
// the customer photo width — much more predictable than before.
export function presetToTransform(preset, photoSize, garmentNatural) {
  const targetWidth = preset.width * photoSize.w;
  const scale = targetWidth / garmentNatural.w;

  return {
    cx: preset.cx * photoSize.w,
    cy: preset.cy * photoSize.h,
    scale,
    rotation: preset.rotation || 0,
  };
}
