// Explicit opt-in only. Saved visual settings never enable default Play.
export const isStorybookPreview=search=>new URLSearchParams(search).get('storybook')==='1';
