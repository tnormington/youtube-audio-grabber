import { useEffect, useState } from 'react';
import { fetchDownloads } from '../lib/api';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function DownloadsList({ refreshKey, onEdit }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDownloads()
      .then(setFiles)
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <section className="downloads-list">
      <h2>Downloaded Files</h2>
      {loading ? (
        <p>Loading...</p>
      ) : files.length === 0 ? (
        <p className="empty">No downloaded files yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Filename</th>
              <th>Size</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.filename}>
                <td className="filename">{f.filename}</td>
                <td>{formatSize(f.size)}</td>
                <td>{formatDate(f.date)}</td>
                <td>
                  <button className="btn-small" onClick={() => onEdit(f.filename)}>
                    Edit Metadata
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
