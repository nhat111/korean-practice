// Sizes the app shell to the area the user can actually see.
// iOS browsers (notably Chrome on iOS with its bottom toolbar) can report a
// 100dvh that is taller than the visible area, which let the whole page
// scroll and pushed the header off-screen. window.innerHeight reflects the
// visible layout viewport, so we expose it as --app-height.

function update(): void {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}

export function trackAppHeight(): void {
  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  // Restored from the back/forward cache: sizes may have changed meanwhile.
  window.addEventListener('pageshow', update);
}
