// For Pages Router: pages/upload.js
// For App Router: app/upload/page.js

import FileUpload from '../components/FileUpload';

export default function UploadPage() {
  return (
    <div>
      <head>
        <title>File Upload - Steel Connect</title>
        <meta name="description" content="Upload files to Firebase Storage" />
      </head>
      
      <main>
        <FileUpload />
      </main>
    </div>
  );
}

// If using App Router (app/upload/page.js), use this instead:
/*
import FileUpload from '../../components/FileUpload';

export default function UploadPage() {
  return (
    <main>
      <FileUpload />
    </main>
  );
}
*/