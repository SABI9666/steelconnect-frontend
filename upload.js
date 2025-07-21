import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { storage } from './firebase-config.js';

window.uploadFile = async function(fileInput) {
  const file = fileInput.files[0];
  if (!file) {
    alert('Please select a file first!');
    return;
  }

  try {
    // Show loading message
    document.getElementById('uploadStatus').innerHTML = 'Uploading...';
    
    // Upload file to Firebase
    const fileRef = ref(storage, `uploads/${file.name}`);
    await uploadBytes(fileRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(fileRef);
    
    // Success message
    document.getElementById('uploadStatus').innerHTML = 'File uploaded successfully!';
    document.getElementById('fileUrl').innerHTML = `<a href="${downloadURL}" target="_blank">View File</a>`;
    
    console.log('File URL:', downloadURL);
    
  } catch (error) {
    document.getElementById('uploadStatus').innerHTML = 'Upload failed: ' + error.message;
    console.error('Upload error:', error);
  }
};