import { useState } from 'react';

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function isPlaylistUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.has('list');
  } catch {
    return false;
  }
}

export default function UrlInput({
  onFetchInfo,
  onFetchPlaylistInfo,
  onDownload,
  onDownloadPlaylist,
  loading,
  videoInfo,
  playlistInfo,
}) {
  const [url, setUrl] = useState('');

  const isPlaylist = isPlaylistUrl(url);

  const handleFetch = () => {
    if (!url) return;
    if (isPlaylist) {
      onFetchPlaylistInfo(url);
    } else {
      onFetchInfo(url);
    }
  };

  return (
    <section className="url-input">
      <h2>Paste a link</h2>
      <div className="input-row">
        <input
          type="text"
          placeholder="https://youtube.com/watch?v=... or playlist URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && url && handleFetch()}
        />
        <button onClick={handleFetch} disabled={!url || loading}>
          {loading ? 'Fetching...' : 'Fetch Info'}
        </button>
      </div>

      {isPlaylist && !playlistInfo && !videoInfo && (
        <div className="playlist-hint">Playlist URL detected</div>
      )}

      {playlistInfo && (
        <div className="playlist-info">
          <div className="playlist-header">
            <h3>{playlistInfo.title || 'Playlist'}</h3>
            <span className="playlist-count">
              {playlistInfo.entries.length} video{playlistInfo.entries.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="playlist-entries">
            {playlistInfo.entries.slice(0, 10).map((entry, i) => (
              <div key={entry.url} className="playlist-entry">
                <span className="playlist-entry-num">{i + 1}</span>
                <span className="playlist-entry-title">{entry.title}</span>
                {entry.duration > 0 && (
                  <span className="playlist-entry-duration">
                    {formatDuration(entry.duration)}
                  </span>
                )}
              </div>
            ))}
            {playlistInfo.entries.length > 10 && (
              <div className="playlist-entry more">
                ...and {playlistInfo.entries.length - 10} more
              </div>
            )}
          </div>
          <button
            className="btn-primary"
            onClick={() => onDownloadPlaylist()}
            disabled={loading}
          >
            Download All ({playlistInfo.entries.length} videos)
          </button>
        </div>
      )}

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
