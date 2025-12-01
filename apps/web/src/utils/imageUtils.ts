/**
 * Image compression utility for avatar uploads
 * Resizes and compresses images before upload to reduce file size
 */

const MAX_SIZE = 512 // Max width/height for avatar
const QUALITY = 0.8  // JPEG quality (0-1)
const MAX_FILE_SIZE = 500 * 1024 // 500KB target after compression

export interface CompressedImage {
  file: File
  preview: string
}

/**
 * Compresses and resizes an image file for avatar use
 * - Resizes to max 512x512 while maintaining aspect ratio
 * - Converts to JPEG for consistent output
 * - Compresses to ~80% quality
 * - Creates a square crop centered on the image
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Calculate dimensions for square crop
        const size = Math.min(img.width, img.height)
        const x = (img.width - size) / 2
        const y = (img.height - size) / 2

        // Create canvas for compression
        const canvas = document.createElement('canvas')
        canvas.width = MAX_SIZE
        canvas.height = MAX_SIZE
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        // Draw image with square crop, centered
        ctx.drawImage(
          img,
          x, y, size, size,  // Source rectangle (square crop from center)
          0, 0, MAX_SIZE, MAX_SIZE  // Destination rectangle
        )

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not compress image'))
              return
            }

            // Create a new File object
            const compressedFile = new File(
              [blob],
              `avatar_${Date.now()}.jpg`,
              { type: 'image/jpeg' }
            )

            // Create preview URL
            const preview = canvas.toDataURL('image/jpeg', QUALITY)

            resolve({
              file: compressedFile,
              preview
            })
          },
          'image/jpeg',
          QUALITY
        )
      }

      img.onerror = () => {
        reject(new Error('Could not load image'))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('Could not read file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Validates an image file before compression
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Please select a JPEG, PNG, WebP, or GIF image' }
  }

  // Check file size (max 10MB before compression)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be less than 10MB' }
  }

  return { valid: true }
}

