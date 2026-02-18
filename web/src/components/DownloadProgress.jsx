import { useEffect, useState } from 'react';
import { subscribeProgress } from '../lib/api';

export default function DownloadProgress({ jobId, onComplete, onError }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    if (!jobId) return;

    setProgress(0);
    setStatus('connecting');

    const unsubscribe = subscribeProgress(jobId, (event) => {
      switch (event.type) {
        case 'progress':
          setStatus('downloading');
          setProgress(event.progress);
          break;
        case 'complete':
          setStatus('complete');
          setProgress(100);
          onComplete(event);
          break;
        case 'error':
          setStatus('error');
          onError(event.error);
          break;
      }
    });

    return unsubscribe;
  }, [jobId]);

  if (!jobId) return null;

  return (
    <section className="download-progress">
      <h2>Download</h2>
      <div className="progress-row">
        <div className="progress-bar-container">
          <div
            className={`progress-bar ${status}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="progress-text">{Math.round(progress)}%</span>
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        {status === 'connecting' && (
          <span className="status-label">
            <span className="spinner" />
            Starting download...
          </span>
        )}
        {status === 'downloading' && (
          <span className="status-label">
            <span className="spinner" />
            Downloading audio...
          </span>
        )}
        {status === 'complete' && (
          <span className="status-label complete">
            Download complete
          </span>
        )}
        {status === 'error' && (
          <span className="status-label error">
            Download failed
          </span>
        )}
      </div>
    </section>
  );
}
