// components/fileupload.js (Update this file)
'use client';

import { useState } from 'react';
// No longer need direct firebase/storage imports here for backend upload
// import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
// import { storage } from '../lib/firebase-config'; // client-side Firebase for other uses is fine

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0); // This will be a simple 0 or 100
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

    const formData = new FormData();
    formData.append('file', file); // 'file' is the field name Multer expects on backend
    formData.append('context', 'general'); // Or 'job', 'quote' depending on your use case

    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/file`, {
            method: 'POST',
            body: formData,
            // If your backend /uploads/file endpoint requires authentication:
            // headers: {
            //   'Authorization': `Bearer ${YOUR_JWT_TOKEN_HERE}` // Get token from local storage or auth context
            // }
        });

        if (response.ok) {
            const data = await response.json();
            setDownloadURL(data.url); // Backend sends back the public URL
            setUploadProgress(100); // Indicate completion
            setFile(null); // Reset file input
            alert('File uploaded successfully through backend!');
        } else {
            const errorData = await response.json();
            setError(`Upload failed: ${errorData.message || 'Unknown error'}`);
        }
    } catch (err) {
        setError(`An error occurred: ${err.message}`);
        console.error('Frontend upload error:', err);
    } finally {
        setUploading(false);
    }
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
          {uploading ? <span className="spinner"></span> : 'Upload to Backend'}
        </button>
      </div>
    </section>
  );
};

export default FileUpload;
