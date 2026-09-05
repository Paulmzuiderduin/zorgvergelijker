function isUmamiAvailable() {
  return typeof window !== 'undefined' && typeof window.umami?.track === 'function';
}

// Keep analytics focused on feature use; never send policy names or care-cost inputs.
export function trackEvent(name, data = {}) {
  if (!isUmamiAvailable()) return;

  try {
    window.umami.track(name, data);
  } catch {
    // Tracking must never interrupt a comparison.
  }
}
