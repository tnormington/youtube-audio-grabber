const BASE = '/api';

export async function fetchVideoInfo(url) {
  const res = await fetch(`${BASE}/video-info?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch video info');
  return res.json();
}

export async function startDownload(url) {
  const res = await fetch(`${BASE}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to start download');
  return res.json();
}

export function subscribeProgress(jobId, onEvent) {
  const es = new EventSource(`${BASE}/download/${jobId}/progress`);
  es.onmessage = (e) => {
    const event = JSON.parse(e.data);
    onEvent(event);
    if (event.type === 'complete' || event.type === 'error') {
      es.close();
    }
  };
  es.onerror = () => {
    onEvent({ type: 'error', error: 'Connection lost' });
    es.close();
  };
  return () => es.close();
}

export async function fetchDownloads() {
  const res = await fetch(`${BASE}/downloads`);
  if (!res.ok) throw new Error('Failed to fetch downloads');
  return res.json();
}

export async function fetchMetadata(filename) {
  const res = await fetch(`${BASE}/downloads/${encodeURIComponent(filename)}/metadata`);
  if (!res.ok) throw new Error('Failed to fetch metadata');
  return res.json();
}

export async function saveMetadata(filename, metadata) {
  const res = await fetch(`${BASE}/metadata/${encodeURIComponent(filename)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to save metadata');
  return res.json();
}

export function getArtworkUrl(filename) {
  return `${BASE}/downloads/${encodeURIComponent(filename)}/artwork`;
}

export async function uploadArtwork(filename, file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
  const res = await fetch(`${BASE}/downloads/${encodeURIComponent(filename)}/artwork`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: base64, contentType: file.type }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to upload artwork');
  return res.json();
}
