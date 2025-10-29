import React, { useState, useRef, useCallback, DragEvent } from 'react';
import { UploadIcon, CloseIcon } from './icons';
import type { TFunction } from '../translations';
import { supportedLanguages } from '../languages';

interface ImageUploaderProps {
  onImageUpload: (files: File[]) => void;
  onLanguageChange: (languageCode: string) => void;
  selectedLanguage: string;
  t: TFunction;
}

const MAX_IMAGES = 3;

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, onLanguageChange, selectedLanguage, t }) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;

    const existingFileNames = new Set(files.map(f => f.name));
    const filesToProcess = Array.from(newFiles)
      .filter(file => file.type.startsWith('image/') && !existingFileNames.has(file.name))
      .slice(0, MAX_IMAGES - files.length);

    if (filesToProcess.length === 0) return;

    const fileReadPromises = filesToProcess.map(file => {
      return new Promise<{ file: File; preview: string }>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ file, preview: reader.result as string });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(fileReadPromises).then(results => {
      setFiles(prev => [...prev, ...results.map(r => r.file)]);
      setPreviews(prev => [...prev, ...results.map(r => r.preview)]);
    });
  }, [files]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
    if (event.target) {
      event.target.value = ''; // Allow re-uploading the same file if removed
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleGenerateClick = () => {
    if (files.length > 0) {
      onImageUpload(files);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  
  const analyzeButtonText = files.length > 1 ? t('analyzeButtonPlural', { count: files.length }) : t('analyzeButton', { count: files.length });

  return (
    <div className="w-full max-w-2xl text-center p-8 bg-[--color-surface] rounded-2xl shadow-xl border border-[--color-border]">
      <div className="mb-2">
        <h2 className="text-4xl font-extrabold text-[--color-text-primary]">{t('imageUploaderTitle')}</h2>
      </div>

      <p className="text-[--color-text-secondary] mb-8">{t('imageUploaderSubtitle', { MAX_IMAGES })}</p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {previews.map((src, index) => (
          <div key={index} className="relative group aspect-square">
            <img src={src} alt={`Fridge preview ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
            <button
              onClick={() => handleRemoveImage(index)}
              className="absolute top-1.5 right-1.5 bg-[--color-accent] text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
              aria-label={`Remove image ${index + 1}`}
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        ))}

        {files.length < MAX_IMAGES && (
          <div 
            className={`relative aspect-square col-span-1 border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${isDragging ? 'border-[--color-accent] bg-[--color-accent]/10' : 'border-[--color-border] hover:border-[--color-primary-light]'}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            role="button"
            aria-label="Add image"
          >
            <UploadIcon className="w-10 h-10 mb-2 text-gray-400" />
            <p className="text-sm font-semibold text-[--color-text-secondary] text-center">{t('addPhoto')}</p>
            <p className="text-xs text-gray-400">{t('photosLeft', { count: MAX_IMAGES - files.length })}</p>
          </div>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
        aria-hidden="true"
      />

      <div className="my-8">
        <label htmlFor="language-select" className="block text-sm font-medium text-[--color-text-secondary] mb-2">
          {t('recipeLanguageLabel')}
        </label>
        <select
            id="language-select"
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="w-full max-w-xs mx-auto p-3 bg-white text-sm text-[--color-text-primary] border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-accent] focus:border-[--color-accent] outline-none transition-colors duration-200"
            aria-label="Select recipe language"
        >
            {supportedLanguages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
        </select>
      </div>


      {files.length > 0 && (
        <div>
          <button
            onClick={handleGenerateClick}
            className="primary-button"
            disabled={files.length === 0}
          >
            {analyzeButtonText}
          </button>
        </div>
      )}
    </div>
  );
};