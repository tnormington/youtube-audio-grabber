import { useState } from 'react';

export default function UrlInput({ onFetchInfo, onDownload, loading, videoInfo }) {
  const [url, setUrl] = useState('');

  return (
    <section className="url-input">
      <h2>Download Audio</h2>
      <div className="input-row">
        <input
          type="text"
          placeholder="Paste YouTube URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && url && onFetchInfo(url)}
        />
        <button onClick={() => onFetchInfo(url)} disabled={!url || loading}>
          {loading ? 'Loading...' : 'Fetch Info'}
        </button>
      </div>

      {videoInfo && (
        <div className="video-info">
          {videoInfo.thumbnail && (
            <img src={videoInfo.thumbnail} alt={videoInfo.title} className="thumbnail" />
          )}
          <div className="video-details">
            <h3>{videoInfo.title}</h3>
            <p className="uploader">{videoInfo.uploader}</p>
            <p className="duration">
              {videoInfo.duration
                ? `${Math.floor(videoInfo.duration / 60)}:${String(videoInfo.duration % 60).padStart(2, '0')}`
                : ''}
            </p>
            <div className="suggested-metadata">
              <span><strong>Artist:</strong> {videoInfo.metadata?.artist}</span>
              <span><strong>Album:</strong> {videoInfo.metadata?.album}</span>
              <span><strong>Year:</strong> {videoInfo.metadata?.date}</span>
            </div>
            <button className="btn-primary" onClick={() => onDownload(url)} disabled={loading}>
              Download
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
