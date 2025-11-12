import { NextRequest, NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

function isValidHttpUrl(s: string): boolean {
    try {
        const u = new URL(s);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

function safeOrigin(u: string) {
    try { return new URL(u).origin + '/'; } catch { return undefined; }
}

function decodeMaybeUrl(s: string) {
    try {
        const d = decodeURIComponent(s);
        if (isValidHttpUrl(d)) return d;
    } catch {}
    return s;
}

function absolutize(base: string, maybeRel: string) {
    const cleaned = decodeMaybeUrl(maybeRel.trim());
    try { return new URL(cleaned, base).toString(); } catch { return cleaned; }
}

function proxifyIfValid(abs: string) {
    if (isValidHttpUrl(abs)) return `/api/proxy?u=${encodeURIComponent(abs)}`;
    if (abs.startsWith('/api/proxy?u=')) return abs;
    return abs;
}

function rewriteM3U8(baseUrl: string, body: string) {
    return body.split('\n').map(line => {
        const raw = line;
        const t = line.trim();

        if (!t) return raw;

        if (t.startsWith('#')) {
            if (t.startsWith('#EXT-X-KEY') || t.startsWith('#EXT-X-MAP')) {
                return raw.replace(/URI="([^"]+)"/g, (_m, uri) => {
                    const abs = absolutize(baseUrl, uri);
                    return `URI="${proxifyIfValid(abs)}"`;  // mantiene comillas
                });
            }
            if (t.startsWith('#EXT-X-STREAM-INF') || t.startsWith('#EXT-X-I-FRAME-STREAM-INF')) {
                return raw;
            }
            return raw;
        }

        const abs = absolutize(baseUrl, t);
        return proxifyIfValid(abs);
    }).join('\n');
}

export async function GET(req: NextRequest) {
    const uRaw = req.nextUrl.searchParams.get('u');
    if (!uRaw) return NextResponse.json({ error: 'Missing u' }, { status: 400 });

    const u = decodeMaybeUrl(uRaw);

    if (!isValidHttpUrl(u)) {
        return NextResponse.json({ error: `Invalid URL: ${u.slice(0, 40)}` }, { status: 400 });
    }

    const range = req.headers.get('range') ?? undefined;
    const origin = safeOrigin(u);

    const upstream = await fetch(u, {
        cache: 'no-store',
        headers: {
            'User-Agent': UA,
            ...(range ? { Range: range } : {}),
            Accept: '*/*',
            ...(origin ? { Referer: origin, Origin: origin } : {}),
        },
    });

    if (!upstream.ok && upstream.status !== 206) {
        return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: upstream.status });
    }

    const headers = new Headers(upstream.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Accept-Ranges, Content-Range');

    const ct = headers.get('Content-Type') || '';
    const isM3U8 =
        u.toLowerCase().includes('.m3u8') ||
        /application\/(vnd\.apple\.mpegurl|x-mpegURL)/i.test(ct);

    if (!ct) {
        if (u.toLowerCase().endsWith('.m3u8')) headers.set('Content-Type', 'application/vnd.apple.mpegurl');
        else if (/\.(ts|mp2t)(\?|$)/i.test(u)) headers.set('Content-Type', 'video/mp2t');
    }

    if (isM3U8) {
        const text = await upstream.text();
        const rewritten = rewriteM3U8(u, text);
        headers.set('Content-Type', 'application/vnd.apple.mpegurl');
        headers.delete('Content-Range');
        headers.delete('Accept-Ranges');
        return new NextResponse(rewritten, { status: 200, headers });
    }

    return new NextResponse(upstream.body, { status: upstream.status, headers });
}
