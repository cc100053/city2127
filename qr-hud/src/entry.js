const cityMatch = location.pathname.match(/^\/city\/([^/]+)\/?$/);
if (cityMatch) {
  const { mountCity } = await import('./city.js');
  let sessionId;
  try { sessionId = decodeURIComponent(cityMatch[1]); } catch { sessionId = ''; }
  mountCity(sessionId);
} else {
  await import('./main.js');
}
