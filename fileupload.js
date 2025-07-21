'use client'; // This directive is necessary for React hooks and event handlers.

import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase-config'; // Correct path to your config

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadURL, setDownloadURL] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setDownloadURL('');
      setUploadProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError('');
    
    // Create a unique file reference
    const storageRef = ref(storage, `uploads/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setUploadProgress(progress);
      },
      (err) => {
        setError(`Upload failed: ${err.message}`);
        setUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          setDownloadURL(url);
          setUploading(false);
          setFile(null); // Reset file input
        });
      }
    );
  };

  return (
    <section className="content-section active" style={{ maxWidth: '700px', margin: '40px auto' }}>
      <div className="section-header">
        <h2 className="section-title">⬆️ File Upload</h2>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="file-upload" className="form-label">Project Document</label>
          <input 
            id="file-upload"
            type="file" 
            className="form-input"
            onChange={handleFileChange} 
            disabled={uploading} 
          />
          {file && <p style={{ marginTop: '10px', color: 'var(--text-gray)' }}>Selected: {file.name}</p>}
        </div>

        {uploading && (
          <div className="form-group">
            <label className="form-label">Upload Progress</label>
            <div style={{ width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '8px' }}>
              <div 
                style={{
                  width: `${uploadProgress}%`, 
                  height: '24px', 
                  backgroundColor: 'var(--primary-color)', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  transition: 'width 0.4s ease'
                }}
              >
                {uploadProgress}%
              </div>
            </div>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}
        
        {downloadURL && (
          <div className="alert alert-success">
            <strong>Upload Complete!</strong>
            <p style={{ marginTop: '8px', wordBreak: 'break-all' }}>
              File URL: <a href={downloadURL} target="_blank" rel="noopener noreferrer">{downloadURL}</a>
            </p>
          </div>
        )}

        <button className="btn btn-primary" onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? <span className="spinner"></span> : 'Upload to Firebase'}
        </button>
      </div>
    </section>
  );
};

export default FileUpload;
