import { useEffect, useRef, useState } from 'react';
import { subscribeProgress } from '../lib/api';

export default function DownloadProgress({ jobIds, onComplete, onError }) {
  const [jobs, setJobs] = useState({});
  const unsubscribesRef = useRef({});

  useEffect(() => {
    if (!jobIds || jobIds.length === 0) return;

    // Initialize state for new jobs only
    setJobs((prev) => {
      const next = {};
      for (const id of jobIds) {
        next[id] = prev[id] || { progress: 0, status: 'connecting', filename: null };
      }
      return next;
    });

    // Subscribe to new jobs
    for (const id of jobIds) {
      if (unsubscribesRef.current[id]) continue;

      const unsubscribe = subscribeProgress(id, (event) => {
        switch (event.type) {
          case 'progress':
            setJobs((prev) => ({
              ...prev,
              [id]: { ...prev[id], status: 'downloading', progress: event.progress },
            }));
            break;
          case 'complete':
            setJobs((prev) => ({
              ...prev,
              [id]: { ...prev[id], status: 'complete', progress: 100, filename: event.filename },
            }));
            onComplete(event);
            break;
          case 'error':
            setJobs((prev) => ({
              ...prev,
              [id]: { ...prev[id], status: 'error' },
            }));
            onError(event.error);
            break;
        }
      });

      unsubscribesRef.current[id] = unsubscribe;
    }

    return () => {
      for (const [id, unsub] of Object.entries(unsubscribesRef.current)) {
        unsub();
      }
      unsubscribesRef.current = {};
    };
  }, [jobIds]);

  if (!jobIds || jobIds.length === 0) return null;

  const jobEntries = jobIds.map((id) => ({ id, ...(jobs[id] || { progress: 0, status: 'connecting', filename: null }) }));
  const completedCount = jobEntries.filter((j) => j.status === 'complete').length;
  const errorCount = jobEntries.filter((j) => j.status === 'error').length;
  const total = jobEntries.length;
  const isMulti = total > 1;
  const allDone = completedCount + errorCount === total;

  return (
    <section className="download-progress">
      <h2>Download{isMulti ? 's' : ''}</h2>

      {isMulti && (
        <div className="download-summary">
          {allDone ? (
            <span className={`status-label ${errorCount > 0 ? 'error' : 'complete'}`}>
              {errorCount > 0
                ? `Done — ${completedCount} complete, ${errorCount} failed`
                : 'All downloads complete'}
            </span>
          ) : (
            <span className="status-label">
              <span className="spinner" />
              {completedCount} of {total} complete
            </span>
          )}
        </div>
      )}

      <div className="download-queue">
        {jobEntries.map((job, i) => (
          <div key={job.id} className="download-job">
            <div className="download-job-label">
              {job.filename || `Video ${i + 1}`}
            </div>
            <div className="progress-row">
              <div className="progress-bar-container">
                <div
                  className={`progress-bar ${job.status}`}
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <span className="progress-text">{Math.round(job.progress)}%</span>
            </div>
            {!isMulti && (
              <div style={{ marginTop: '0.5rem' }}>
                {job.status === 'connecting' && (
                  <span className="status-label">
                    <span className="spinner" />
                    Starting download...
                  </span>
                )}
                {job.status === 'downloading' && (
                  <span className="status-label">
                    <span className="spinner" />
                    Downloading audio...
                  </span>
                )}
                {job.status === 'complete' && (
                  <span className="status-label complete">Download complete</span>
                )}
                {job.status === 'error' && (
                  <span className="status-label error">Download failed</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
