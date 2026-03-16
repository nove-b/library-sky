"use server";

import sharp from "sharp";

export interface ProcessedImageBuffer {
  buffer: Buffer;
  width: number;
  height: number;
  contentType: string;
}

/**
 * Process book cover image for Bluesky posting
 * - Resize book cover to fit in a nice design
 * - Add background aesthetic
 * - Optimize for quality and file size
 */
export async function processBookImageForBluesky(
  imageBuffer: Buffer,
  contentType: string
): Promise<ProcessedImageBuffer> {
  try {
    // Book cover dimensions (typical 2:3 aspect ratio)
    const bookCoverWidth = 400;
    const bookCoverHeight = 600;

    // Final image dimensions with background
    const finalWidth = 600;
    const finalHeight = 900;

    // Process book cover first
    const processedBook = await sharp(imageBuffer)
      .resize(bookCoverWidth, bookCoverHeight, {
        fit: "cover",
        position: "center",
      })
      .toBuffer();

    // Create composite image with background
    // Use stone background color (#3d3425) for a book-like aesthetic
    const compositeBuffer = await sharp({
      create: {
        width: finalWidth,
        height: finalHeight,
        channels: 3,
        background: { r: 61, g: 52, b: 37 }, // Stone/book color
      },
    })
      .composite([
        {
          input: processedBook,
          top: Math.floor((finalHeight - bookCoverHeight) / 2),
          left: Math.floor((finalWidth - bookCoverWidth) / 2),
        },
      ])
      .png({ quality: 95 })
      .toBuffer();

    return {
      buffer: compositeBuffer,
      width: finalWidth,
      height: finalHeight,
      contentType: "image/png",
    };
  } catch (error) {
    console.error("Failed to process book image:", error);
    // Return original image if processing fails
    return {
      buffer: imageBuffer,
      width: 0,
      height: 0,
      contentType: contentType,
    };
  }
}
