// File defaults only; reload Play after editing. No saved settings are changed.
export const environmentConfig={
  enabled:true, // false restores the existing painted background and its settings.
  mountains:{enabled:true,scale:.88,distance:1,hazeStrength:.5},
  // Scale controls height (0.5–1.5); distance controls radius (0.8–2).
  // Radius derives from the complete sandbox + rally bounds, in world metres.
  sky:{enabled:true,zenith:'#1684d4',horizon:'#c9e6ed'},
  clouds:{enabled:true,density:.85,movementSpeed:0},
  // Density 0–1: up to 42 fused clusters, three instanced draws. Static by default.
  // Optional movementSpeed: radians/second, clamped 0–0.01.
};
