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
 * - Add gradient background below the book
 * - Optimize for quality and file size
 */
export async function processBookImageForBluesky(
  imageBuffer: Buffer,
  contentType: string
): Promise<ProcessedImageBuffer> {
  try {
    // Book cover dimensions (typical 2:3 aspect ratio)
    // We'll resize to 400x600 for the book cover, then add background
    const bookCoverWidth = 400;
    const bookCoverHeight = 600;

    // Final image dimensions with background
    const finalWidth = 600;
    const finalHeight = 900;

    // Convert to PNG if needed (better quality for composite)
    const processedBook = await sharp(imageBuffer)
      .resize(bookCoverWidth, bookCoverHeight, {
        fit: "cover",
        position: "center",
      })
      .png({ quality: 95, effort: 9 })
      .toBuffer();

    // Create a gradient background (stone/book theme)
    const svgGradient = Buffer.from(
      `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#3d3425;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1a1410;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${finalWidth}" height="${finalHeight}" fill="url(#grad)"/>
      </svg>`
    );

    // Composite: create background, then overlay book cover centered
    const compositeBuffer = await sharp({
      create: {
        width: finalWidth,
        height: finalHeight,
        channels: 3,
        background: { r: 61, g: 52, b: 37 }, // Stone color
      },
    })
      .composite([
        {
          input: svgGradient,
          top: 0,
          left: 0,
        },
      ])
      .composite([
        {
          input: processedBook,
          top: Math.floor((finalHeight - bookCoverHeight) / 2),
          left: Math.floor((finalWidth - bookCoverWidth) / 2),
        },
      ])
      .png({ quality: 95, effort: 9 })
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
