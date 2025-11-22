import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  url?: string;
  error?: string;
}

/**
 * Upload an image to Firebase Storage
 * @param file - The image file to upload
 * @param path - Storage path (default: 'products')
 * @param onProgress - Callback for upload progress updates
 * @returns Promise with the download URL
 */
export async function uploadImage(
  file: File,
  path: string = 'products',
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 5MB');
  }

  // Create unique filename
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const filename = `${timestamp}_${sanitizedName}`;
  const storageRef = ref(storage, `${path}/${filename}`);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Progress callback
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          progress,
          status: 'uploading',
        });
      },
      (error) => {
        // Error callback
        console.error('Upload error:', error);
        onProgress?.({
          progress: 0,
          status: 'error',
          error: error.message,
        });
        reject(error);
      },
      async () => {
        // Complete callback
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress?.({
            progress: 100,
            status: 'complete',
            url: downloadURL,
          });
          resolve(downloadURL);
        } catch (error: any) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Delete an image from Firebase Storage
 * @param imageUrl - The full download URL of the image
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Extract storage path from URL
    const url = new URL(imageUrl);
    const path = decodeURIComponent(url.pathname.split('/o/')[1]?.split('?')[0] || '');

    if (!path) {
      console.warn('Could not extract storage path from URL');
      return;
    }

    const imageRef = ref(storage, path);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw - deleting old images is not critical
  }
}

/**
 * Validate image dimensions
 * @param file - The image file
 * @param minWidth - Minimum width (optional)
 * @param minHeight - Minimum height (optional)
 * @returns Promise resolving to true if valid
 */
export function validateImageDimensions(
  file: File,
  minWidth?: number,
  minHeight?: number
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      if (minWidth && img.width < minWidth) {
        reject(new Error(`Image width must be at least ${minWidth}px`));
        return;
      }

      if (minHeight && img.height < minHeight) {
        reject(new Error(`Image height must be at least ${minHeight}px`));
        return;
      }

      resolve(true);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid image file'));
    };

    img.src = objectUrl;
  });
}
