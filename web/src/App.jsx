import { useState, useCallback } from 'react';
import UrlInput from './components/UrlInput';
import DownloadProgress from './components/DownloadProgress';
import MetadataEditor from './components/MetadataEditor';
import DownloadsList from './components/DownloadsList';
import {
  fetchVideoInfo,
  startDownload,
  fetchPlaylistInfo,
  startPlaylistDownload,
} from './lib/api';
import './App.css';

export default function App() {
  const [videoInfo, setVideoInfo] = useState(null);
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobIds, setJobIds] = useState([]);
  const [editingFile, setEditingFile] = useState(null);
  const [initialMetadata, setInitialMetadata] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFetchInfo = useCallback(async (url) => {
    setLoading(true);
    setError('');
    setVideoInfo(null);
    setPlaylistInfo(null);
    try {
      const info = await fetchVideoInfo(url);
      setVideoInfo(info);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFetchPlaylistInfo = useCallback(async (url) => {
    setLoading(true);
    setError('');
    setVideoInfo(null);
    setPlaylistInfo(null);
    try {
      const info = await fetchPlaylistInfo(url);
      setPlaylistInfo(info);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownload = useCallback(async (url) => {
    setLoading(true);
    setError('');
    setEditingFile(null);
    setInitialMetadata(null);
    try {
      const { jobId } = await startDownload(url);
      setJobIds([jobId]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownloadPlaylist = useCallback(async () => {
    if (!playlistInfo?.entries?.length) return;
    setLoading(true);
    setError('');
    setEditingFile(null);
    setInitialMetadata(null);
    try {
      const { jobIds: ids } = await startPlaylistDownload(playlistInfo.entries);
      setJobIds(ids);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [playlistInfo]);

  const handleDownloadComplete = useCallback((event) => {
    if (event.filename) {
      setEditingFile(event.filename);
      setInitialMetadata(event.metadata || null);
    }
    setRefreshKey((k) => k + 1);
  }, []);

  const handleDownloadError = useCallback((msg) => {
    setError(msg);
  }, []);

  const handleEditFile = useCallback((filename) => {
    setEditingFile(filename);
    setInitialMetadata(null);
  }, []);

  const handleMetadataSaved = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="app">
      <header>
        <h1>YouTube Audio Grabber</h1>
        <p>Download, tag, and organize audio from YouTube</p>
      </header>

      <main>
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError('')} aria-label="Dismiss">&times;</button>
          </div>
        )}

        <UrlInput
          onFetchInfo={handleFetchInfo}
          onFetchPlaylistInfo={handleFetchPlaylistInfo}
          onDownload={handleDownload}
          onDownloadPlaylist={handleDownloadPlaylist}
          loading={loading}
          videoInfo={videoInfo}
          playlistInfo={playlistInfo}
        />

        <DownloadProgress
          jobIds={jobIds}
          onComplete={handleDownloadComplete}
          onError={handleDownloadError}
        />

        <MetadataEditor
          filename={editingFile}
          initialMetadata={initialMetadata}
          onSaved={handleMetadataSaved}
        />

        <DownloadsList
          refreshKey={refreshKey}
          onEdit={handleEditFile}
        />
      </main>
    </div>
  );
}
