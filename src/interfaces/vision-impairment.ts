export enum VisionImpairment {
  MILD,
  MODERATE,
  SEVERE,
  BLINDNESS,
  NEAR,
  NONE,
}

export const VisionImpairmentOptionsMap = [
  { title: 'auth.register.vision.mild', value: VisionImpairment.MILD },
  { title: 'auth.register.vision.moderate', value: VisionImpairment.MODERATE },
  { title: 'auth.register.vision.severe', value: VisionImpairment.SEVERE },
  { title: 'auth.register.vision.blindness', value: VisionImpairment.BLINDNESS },
  { title: 'auth.register.vision.near', value: VisionImpairment.NEAR },
  { title: 'auth.register.vision.none', value: VisionImpairment.NONE },
];