const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function otpPost(path, body) {
  const r = await fetch(`${API}/otp${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || 'Something went wrong');
  return d;
}
