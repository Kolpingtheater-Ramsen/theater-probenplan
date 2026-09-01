const port = process.env.PORT ?? '3000';
try {
  const response = await fetch(`http://127.0.0.1:${port}/api/healthz/`, { signal: AbortSignal.timeout(4000) });
  if (!response.ok) process.exit(1);
  const payload = await response.json();
  process.exit(payload.status === 'ok' ? 0 : 1);
} catch {
  process.exit(1);
}
