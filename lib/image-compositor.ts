import sharp from "sharp";

interface CompositeImageOptions {
  imageUrl: string;
  width?: number;
  height?: number;
}

/**
 * Generate a composite image from book cover
 * This is used for BlueSky posting - simplified to avoid Pango font rendering issues
 */
export async function generateCompositeImage(
  options: CompositeImageOptions
): Promise<Buffer> {
  const {
    imageUrl,
    width = 630,
    height = 630,
  } = options;

  try {
    // Fetch the book cover image
    const coverResponse = await fetch(imageUrl);
    if (!coverResponse.ok) {
      throw new Error(`Failed to fetch cover image: ${coverResponse.statusText}`);
    }
    const coverBuffer = await coverResponse.arrayBuffer();

    // Resize cover image to fit dimensions
    const resized = await sharp(Buffer.from(coverBuffer))
      .resize(width, height, {
        fit: "cover",
        position: "center",
      })
      .png()
      .toBuffer();

    return resized;
  } catch (error) {
    console.error("[image-compositor] Error generating composite image:", error);
    throw new Error(
      `Failed to generate composite image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
