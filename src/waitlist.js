const WAITLIST_ENDPOINT = 'https://qjhqszzdfrotkbwgkvwy.supabase.co/functions/v1/waitlist';

export async function submitWaitlistAction(payload) {
  const response = await fetch(WAITLIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Er ging iets mis. Probeer het later opnieuw.');
  }

  return result;
}
