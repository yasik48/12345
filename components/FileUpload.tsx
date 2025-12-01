
import React, { useState, useCallback } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  label: string;
  id: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile, label, id }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    onFileSelect(file);
  };

  const handleDragEvents = (event: React.DragEvent<HTMLDivElement>, dragState: boolean) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(dragState);
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(event, false);
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const acceptedTypes = ['.txt', '.csv', '.md'];
      const fileExtension = '.' + file.name.split('.').pop();
      if (acceptedTypes.includes(fileExtension) || file.type.startsWith('text/')) {
        onFileSelect(file);
      } else {
        console.warn('Unsupported file type dropped:', file.type);
        // Optionally, you can set an error state here to inform the user.
      }
    }
  }, [onFileSelect]);

  const dropzoneClasses = `mt-1 flex justify-center rounded-md border-2 border-dashed px-6 pt-5 pb-6 transition-colors duration-200 ${
    isDragging
      ? 'border-indigo-500 bg-indigo-50 dark:bg-gray-800'
      : 'border-gray-300 dark:border-gray-600'
  }`;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div
        className={dropzoneClasses}
        onDragOver={(e) => handleDragEvents(e, true)}
        onDragEnter={(e) => handleDragEvents(e, true)}
        onDragLeave={(e) => handleDragEvents(e, false)}
        onDrop={handleDrop}
      >
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex text-sm text-gray-600 dark:text-gray-400">
            <label htmlFor={id} className="relative cursor-pointer rounded-md bg-white dark:bg-gray-700 font-medium text-indigo-600 dark:text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500">
              <span>Upload a file</span>
              <input id={id} name={id} type="file" className="sr-only" onChange={handleFileChange} accept=".txt,.csv,.md" />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          {selectedFile ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 truncate">{selectedFile.name}</p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-500">TXT, CSV, MD up to 10MB</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
