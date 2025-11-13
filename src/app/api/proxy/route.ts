// app/api/proxy/route.ts
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return new Response('Missing url', { status: 400 });
  }

  const upstreamUrl = new URL(urlParam);

  const upstream = await fetch(upstreamUrl.toString(), {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  });

  const contentType = upstream.headers.get('content-type') || '';
  const isM3U =
    contentType.toLowerCase().includes('application/vnd.apple.mpegurl') ||
    contentType.toLowerCase().includes('application/x-mpegurl') ||
    upstreamUrl.pathname.endsWith('.m3u8');

  // Si es playlist, reescribimos
  if (isM3U) {
    const text = await upstream.text();

    const base = upstreamUrl; // para resolver rutas relativas

    const rewritten = text
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        // comentarios o líneas vacías tal cual
        if (!trimmed || trimmed.startsWith('#')) return line;

        try {
          // Resolvemos contra la URL original (para convertir relativo -> absoluto)
          const absolute = new URL(trimmed, base).toString();
          // Y lo pasamos otra vez por el proxy
          const proxied = `/api/proxy?url=${encodeURIComponent(absolute)}`;
          return proxied;
        } catch {
          // Si falla, devolvemos la línea original
          return line;
        }
      })
      .join('\n');

    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.apple.mpegurl');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(rewritten, {
      status: upstream.status,
      headers,
    });
  }

  // Para segmentos .ts/.aac/etc: passthrough
  const headers = new Headers(upstream.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.delete('content-security-policy');
  headers.delete('content-encoding');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
