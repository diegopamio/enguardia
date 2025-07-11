'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageUploaderProps {
  onImageCropped: (file: File | null, isRemoved?: boolean) => void;
  aspect?: number;
  currentImageUrl?: string | null;
  placeholder?: React.ReactNode;
}

function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number
  ) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
}

export default function ImageUploader({ onImageCropped, aspect = 1, currentImageUrl, placeholder }: ImageUploaderProps) {
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cropImage = useCallback(async () => {
    if (!completedCrop || !previewCanvasRef.current || !imgRef.current) {
      return;
    }

    const canvas = previewCanvasRef.current;
    const image = imgRef.current;
    
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return new Promise<File>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create blob');
        }
        const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg', 0.95);
    });
  }, [completedCrop]);

  useEffect(() => {
    async function getCroppedImage() {
      try {
        const file = await cropImage();
        if (file) {
          onImageCropped(file);
        }
      } catch (error) {
        console.error('Error cropping image:', error);
      }
    }

    if (completedCrop) {
      getCroppedImage();
    }
  }, [completedCrop, cropImage, onImageCropped]);

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Makes crop preview update between images.
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || '')
      );
      reader.readAsDataURL(e.target.files[0]);
    } else {
      onImageCropped(null);
    }
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect));
  }

  const showCropper = !!imgSrc;
  const showCurrent = !imgSrc && currentImageUrl && currentImageUrl.startsWith('https');

  const handleRemoveClick = () => {
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    if (previewCanvasRef.current) {
      const context = previewCanvasRef.current.getContext('2d');
      context?.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
    }
    onImageCropped(null, true); // Signal removal
  };

  return (
    <div>
      {/* Hidden canvas needed for cropping */}
      <canvas ref={previewCanvasRef} style={{ display: 'none' }} />
      
      <div className="w-full aspect-square flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg overflow-hidden p-2">
        {showCropper ? (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              circularCrop={aspect === 1}
            >
              <img ref={imgRef} alt="Crop me" src={imgSrc} onLoad={onImageLoad} style={{ maxHeight: '250px' }} />
            </ReactCrop>
        ) : showCurrent ? (
          <img src={currentImageUrl} alt="Current logo" className="w-full h-full object-contain" />
        ) : (
          placeholder
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {showCurrent ? 'Change Logo' : 'Add Logo'}
          </button>
        <input id="image-upload" type="file" accept="image/*" onChange={onSelectFile} className="hidden" ref={fileInputRef} />
        {(showCurrent || showCropper) && (
           <button 
             type="button" 
             onClick={handleRemoveClick}
             className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center"
             aria-label="Remove logo"
           >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
           </button>
        )}
      </div>
    </div>
  );
} 