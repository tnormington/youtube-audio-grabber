import { useState } from 'react';

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function UrlInput({ onFetchInfo, onDownload, loading, videoInfo }) {
  const [url, setUrl] = useState('');

  return (
    <section className="url-input">
      <h2>Paste a link</h2>
      <div className="input-row">
        <input
          type="text"
          placeholder="https://youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && url && onFetchInfo(url)}
        />
        <button onClick={() => onFetchInfo(url)} disabled={!url || loading}>
          {loading ? 'Fetching...' : 'Fetch Info'}
        </button>
      </div>

      {videoInfo && (
        <div className="video-info">
          {videoInfo.thumbnail && (
            <img src={videoInfo.thumbnail} alt="" className="thumbnail" />
          )}
          <div className="video-details">
            <h3>{videoInfo.title}</h3>
            <div className="meta-line">
              <span>{videoInfo.uploader}</span>
              {videoInfo.duration > 0 && (
                <>
                  <span className="dot" />
                  <span>{formatDuration(videoInfo.duration)}</span>
                </>
              )}
            </div>
            <div className="suggested-metadata">
              {videoInfo.metadata?.artist && (
                <span className="tag">{videoInfo.metadata.artist}</span>
              )}
              {videoInfo.metadata?.album && (
                <span className="tag">{videoInfo.metadata.album}</span>
              )}
              {videoInfo.metadata?.date && (
                <span className="tag">{videoInfo.metadata.date}</span>
              )}
            </div>
            <button className="btn-primary" onClick={() => onDownload(url)} disabled={loading}>
              Download Audio
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
