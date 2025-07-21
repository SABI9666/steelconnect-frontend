// components/FileUpload.js
import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadURL, setDownloadURL] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setDownloadURL('');
      setUploadProgress(0);
    }
  };

  const uploadFile = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Create a storage reference
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `uploads/${fileName}`);

      // Upload file
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Monitor upload progress
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
          console.log('Upload is ' + progress + '% done');
        },
        (error) => {
          console.error('Upload error:', error);
          setError(`Upload failed: ${error.message}`);
          setUploading(false);
        },
        async () => {
          // Upload completed successfully
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setDownloadURL(url);
            setUploading(false);
            setUploadProgress(100);
            console.log('File available at:', url);
          } catch (error) {
            console.error('Error getting download URL:', error);
            setError('Failed to get download URL');
            setUploading(false);
          }
        }
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(`Upload error: ${error.message}`);
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadProgress(0);
    setDownloadURL('');
    setUploading(false);
    setError('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h2>Firebase File Upload</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ marginBottom: '10px' }}
        />
        
        {file && (
          <div>
            <p>Selected: {file.name}</p>
            <p>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={uploadFile}
          disabled={!file || uploading}
          style={{
            padding: '10px 20px',
            backgroundColor: uploading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>

        <button
          onClick={resetUpload}
          disabled={uploading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      {uploading && (
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              width: '100%',
              backgroundColor: '#e9ecef',
              borderRadius: '5px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${uploadProgress}%`,
                height: '20px',
                backgroundColor: '#28a745',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <p>{uploadProgress}% uploaded</p>
        </div>
      )}

      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {downloadURL && (
        <div style={{ marginTop: '20px' }}>
          <h3>Upload Successful!</h3>
          <p>File URL:</p>
          <a href={downloadURL} target="_blank" rel="noopener noreferrer">
            {downloadURL}
          </a>
        </div>
      )}
    </div>
  );
};

export default FileUpload;