import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const logoUri = fs.readFileSync(path.join(process.cwd(), 'scratch', 'logo_uri.txt'), 'utf8').trim();
    const match = logoUri.match(/^data:(image\/[^;]+);base64,(.+)$/);

    if (!match) {
      return new Response('Logo asset not found', { status: 404 });
    }

    const [, mimeType, base64Data] = match;
    const buffer = Buffer.from(base64Data, 'base64');

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    return new Response(error?.message || 'Logo asset not found', { status: 404 });
  }
}
