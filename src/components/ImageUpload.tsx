/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageUploadProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  label?: string;
  aspectRatio?: 'square' | 'video' | 'any';
  maxSizeInKB?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  className,
  label = "Upload Image",
  aspectRatio = 'square',
  maxSizeInKB = 5120
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeInKB * 1024) {
      alert(`File is too large. Maximum size is ${maxSizeInKB}KB.`);
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;
      if (!result) {
        setIsUploading(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize logic to keep base64 strings manageable
          const MAX_DIM = 800; 
          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Use JPEG for better compression to stay within Firestore limits
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7); 
            onChange(dataUrl);
          }
        } catch (err) {
          console.error("Error processing image:", err);
        } finally {
          setIsUploading(false);
        }
      };
      
      img.onerror = () => {
        console.error("Error loading image for processing");
        setIsUploading(false);
      };

      img.src = result as string;
    };

    reader.onerror = () => {
      console.error("Error reading file");
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">{label}</label>}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative group border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden bg-[var(--bg-secondary)] min-h-[120px]",
          value ? "border-brand-blue/30" : "border-[var(--border-color)] hover:border-brand-blue/50",
          aspectRatio === 'square' ? "aspect-square" : aspectRatio === 'video' ? "aspect-video" : ""
        )}
      >
        {value ? (
          <>
            <img 
              src={value} 
              alt="Uploaded" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-[10px] font-black uppercase tracking-widest">Change Image</p>
            </div>
            <button 
              onClick={handleClear}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-[var(--text-secondary)] group-hover:text-brand-blue transition-colors">
            {isUploading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Upload size={24} />
            )}
            <p className="text-[10px] font-black uppercase tracking-widest text-center">
              {isUploading ? "Processing..." : "Select File"}
            </p>
            <p className="text-[8px] font-bold opacity-50 uppercase tracking-tighter">MAX {maxSizeInKB}KB</p>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>
    </div>
  );
};
