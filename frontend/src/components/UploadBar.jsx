import { useRef } from "react";

export default function UploadBar({ disabled, onCvUpload, onPhotoUpload }) {
  const cvRef = useRef(null);
  const photoRef = useRef(null);

  return (
    <div className="upload-bar">
      <input
        ref={cvRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onCvUpload(file);
          e.target.value = "";
        }}
      />
      <input
        ref={photoRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPhotoUpload(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        className="btn btn-sm btn-ghost upload-bar-btn"
        disabled={disabled}
        onClick={() => cvRef.current?.click()}
        title="Upload existing CV (PDF, Word, TXT)"
      >
        Upload CV
      </button>
      <button
        type="button"
        className="btn btn-sm btn-ghost upload-bar-btn"
        disabled={disabled}
        onClick={() => photoRef.current?.click()}
        title="Upload profile photo"
      >
        Profile photo
      </button>
    </div>
  );
}
