import sharp from "sharp";

interface CompositeImageOptions {
  title: string;
  author: string;
  imageUrl: string;
  width?: number;
  height?: number;
}

/**
 * Generate a composite image with title on the left and book cover on the right
 * This is used for BlueSky posting
 */
export async function generateCompositeImage(
  options: CompositeImageOptions
): Promise<Buffer> {
  const {
    title,
    author,
    imageUrl,
    width = 1200,
    height = 630, // Twitter card aspect ratio
  } = options;

  try {
    // Fetch the book cover image
    const coverResponse = await fetch(imageUrl);
    if (!coverResponse.ok) {
      throw new Error(`Failed to fetch cover image: ${coverResponse.statusText}`);
    }
    const coverBuffer = await coverResponse.arrayBuffer();

    // Calculate dimensions for cover image (right side)
    const coverHeight = height;
    const coverWidth = Math.floor((coverHeight * 2) / 3); // Typical book cover aspect ratio
    const textWidth = width - coverWidth - 40; // 40px padding

    // Create cover image with fixed dimensions
    const resizedCover = await sharp(Buffer.from(coverBuffer))
      .resize(coverWidth, coverHeight, {
        fit: "cover",
        position: "center",
      })
      .png()
      .toBuffer();

    // Create SVG for text content (title and author)
    const textSvg = createTextSvg({
      title,
      author,
      width: textWidth,
      height,
    });

    // Create composite image
    const composite = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }, // White background
      },
    })
      .composite([
        {
          input: textSvg,
          left: 20,
          top: 0,
        },
        {
          input: resizedCover,
          left: width - coverWidth - 20,
          top: 0,
        },
      ])
      .png()
      .toBuffer();

    return composite;
  } catch (error) {
    console.error("[image-compositor] Error generating composite image:", error);
    throw new Error(
      `Failed to generate composite image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Create SVG with title and author text
 */
function createTextSvg(options: {
  title: string;
  author: string;
  width: number;
  height: number;
}): Buffer {
  const { title, author, width, height } = options;

  // Truncate and wrap title text
  const maxTitleChars = 40;
  const truncatedTitle = title.length > maxTitleChars
    ? title.substring(0, maxTitleChars) + "..."
    : title;

  const truncatedAuthor = author.length > 20
    ? author.substring(0, 20) + "..."
    : author;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      </style>
      
      <!-- Title -->
      <text
        x="20"
        y="80"
        font-size="48"
        font-weight="bold"
        fill="#1a1a1a"
        width="${width - 40}"
        text-anchor="start"
        dominant-baseline="start"
      >
        ${escapeXml(truncatedTitle)}
      </text>
      
      <!-- Author -->
      <text
        x="20"
        y="180"
        font-size="32"
        fill="#666"
        text-anchor="start"
        dominant-baseline="start"
      >
        ✍️ ${escapeXml(truncatedAuthor)}
      </text>
      
      <!-- Footer -->
      <text
        x="20"
        y="${height - 30}"
        font-size="20"
        fill="#999"
        text-anchor="start"
        dominant-baseline="start"
      >
        📚 library-sky
      </text>
    </svg>
  `;

  return Buffer.from(svg);
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
