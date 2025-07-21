import FileUpload from '../../components/FileUpload';

export default function UploadPage() {
  return (
    <main className="main-container">
      <head>
        <title>File Upload - Steel Connect</title>
        <meta name="description" content="Upload files to Firebase Storage" />
      </head>
      <FileUpload />
    </main>
  );
}
