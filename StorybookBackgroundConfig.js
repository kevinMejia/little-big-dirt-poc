// Visual-review defaults only. Used exclusively by ?storybook=1; normal Play is
// unchanged. All values update live in Settings → Storybook Preview.
export const storybookBackgroundConfig={
 // Final painted background exposure multiplier; 0.4–1.6. No foreground relighting.
 brightness:1,
 // Background color saturation multiplier; 0 = grayscale, 1 = artwork, max 1.6.
 saturation:1,
 // sRGB multiplication tint, #RRGGBB. White preserves the original painted palette.
 skyTint:'#ffffff',
 // Sun halo compass bearing, degrees 0–360; 0 points along +Z, 90 along +X.
 sunAzimuth:325,
 // Sun halo elevation above horizon, degrees 0–80. Does not move gameplay lights.
 sunElevation:28,
 // Warm sun disc/halo intensity, 0–2. Zero disables the runtime sun overlay.
 sunGlow:.65,
 // Painted mountain band and distant transition geometry; not playable terrain.
 mountainsVisible:true,
 // Atmospheric softening of the distant background, 0–100%. No foreground fog.
 hazePercent:22,
 // Cloud-layer drift, degrees per second 0–0.03. Mountains remain stationary.
 cloudSpeed:.006,
 // Background horizontal scale, 0.75–1.5. Terrain-edge attachment stays fixed.
 backgroundScale:1,
 // Vertical panoramic alignment, degrees -20–20. Higher raises painted horizon.
 horizonAlignment:16,
 // Compass rotation of the painted panorama, degrees 0–360.
 panoramaRotation:20,
};
