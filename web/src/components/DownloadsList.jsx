import React, { useEffect, useState } from 'react';
import { fetchDownloads, getArtworkUrl } from '../lib/api';
import MetadataEditor from './MetadataEditor';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DownloadsList({ refreshKey, onEdit, editingFile, initialMetadata, onSaved }) {
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
      <div className="list-header">
        <h2>Library</h2>
        {!loading && files.length > 0 && (
          <span className="file-count">{files.length} file{files.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <div className="loading-skeleton">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton-row" />)}
        </div>
      ) : files.length === 0 ? (
        <div className="empty-state">
          <div className="icon">~</div>
          <p>No downloaded files yet</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="art-col"></th>
              <th>Filename</th>
              <th>Title</th>
              <th>Artist</th>
              <th>Album</th>
              <th>Size</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => {
              const isEditing = editingFile === f.filename;
              return (
                <React.Fragment key={f.filename}>
                  <tr className={isEditing ? 'active-row' : ''}>
                    <td className="art-cell">
                      <img
                        src={getArtworkUrl(f.filename)}
                        alt=""
                        className="art-thumb"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </td>
                    <td className="filename-cell" title={f.filename}>{f.filename}</td>
                    <td className={`meta-cell ${f.metadata?.title ? '' : 'empty'}`}>
                      {f.metadata?.title || '--'}
                    </td>
                    <td className={`meta-cell ${f.metadata?.artist ? '' : 'empty'}`}>
                      {f.metadata?.artist || '--'}
                    </td>
                    <td className={`meta-cell ${f.metadata?.album ? '' : 'empty'}`}>
                      {f.metadata?.album || '--'}
                    </td>
                    <td className="size-cell">{formatSize(f.size)}</td>
                    <td className="actions-cell">
                      <button className="btn-small" onClick={() => onEdit(isEditing ? null : f.filename)}>
                        {isEditing ? 'Close' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                  {isEditing && (
                    <tr className="editor-row">
                      <td colSpan="7">
                        <MetadataEditor
                          filename={editingFile}
                          initialMetadata={initialMetadata}
                          onSaved={onSaved}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
