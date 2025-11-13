import { NextResponse } from 'next/server';

export type Channel = {
  name: string;
  url: string;
  logo?: string;
  group?: string;
};

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url) return NextResponse.json({ error: 'Falta url' }, { status: 400 });

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok)
      return NextResponse.json({ error: `Cannot download: ${res.status}` }, { status: 400 });

    const text = await res.text();
    const channels = parseM3U(text);

    return NextResponse.json({ channels }, { status: 200 });
  } catch {
    return NextResponse.json('Error', { status: 500 });
  }
}

function isM3U8(u: string) {
  return /\.m3u8(\?|$)/i.test(u);
}

function xtreamToHls(u: string): string {
  try {
    const url = new URL(u);
    const p = url.pathname.replace(/\/+$/, '');
    if (isM3U8(u)) return url.toString();

    // /USER/PASS/ID -> /live/USER/PASS/ID.m3u8
    const m = p.match(/^\/([^/]+)\/([^/]+)\/(\d+)$/);
    if (m) {
      const [, user, pass, id] = m;
      url.pathname = `/live/${user}/${pass}/${id}.m3u8`;
      url.search = '';
      return url.toString();
    }
  } catch {}
  return u;
}

function parseM3U(text: string): Channel[] {
  const lines = text.split(/\r?\n/);
  const out: Channel[] = [];
  let pending: Partial<Channel> | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      const attrs = Object.fromEntries(
        Array.from(line.matchAll(/([a-zA-Z0-9\-]+)="([^"]*)"/g)).map(m => [m[1], m[2]]),
      );
      const nameMatch = line.split(',').pop()?.trim();
      pending = {
        name: nameMatch || 'Canal',
        logo: attrs['tvg-logo'],
        group: attrs['group-title'],
      };
      continue;
    }

    if (pending && !line.startsWith('#')) {
      const upgraded = xtreamToHls(line);
      out.push({ ...(pending as Channel), url: upgraded });
      pending = null;
    }
  }

  out.sort((a, b) => Number(isM3U8(b.url)) - Number(isM3U8(a.url)));
  return out;
}
