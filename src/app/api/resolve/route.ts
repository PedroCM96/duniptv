import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url) return NextResponse.json({ error: 'Falta url' }, { status: 400 });

    const ua = req.headers.get('user-agent') ?? 'Mozilla/5.0';

    const head = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': ua, Accept: '*/*' },
      cache: 'no-store',
    });

    if (head.status >= 300 && head.status < 400) {
      const loc = head.headers.get('location');
      if (loc) {
        const finalUrl = new URL(loc, url).toString();
        return NextResponse.json({ m3u8: finalUrl }, { status: 200 });
      }
    }

    const getRes = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': ua, Accept: '*/*' },
      cache: 'no-store',
    });

    if (!getRes.ok) {
      return NextResponse.json({ error: `Origen ${getRes.status}` }, { status: 400 });
    }

    return NextResponse.json({ m3u8: url }, { status: 200 });
  } catch {
    return NextResponse.json({ status: 500 });
  }
}
