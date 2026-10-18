// Approved scenery is on by default; the explicit zero flag retains comparison access.
export const isStorybookEnabled=search=>new URLSearchParams(search).get('storybook')!=='0';
// Review camera controls remain exclusive to the explicit review route.
export const isStorybookPreview=search=>new URLSearchParams(search).get('storybook')==='1';
