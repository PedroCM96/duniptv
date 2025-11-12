'use client';
import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

type Props = { src?: string; poster?: string };

export default function Player({ src, poster }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return;

        const log = (...a: unknown[]) => console.log('[VIDEO]', ...a);
        const onError = () => {
            const err = video.error;
            log('error', err?.code, err); // 1 abort, 2 network, 3 decode, 4 src_not_supported
        };
        const handlers: Record<string, () => void> = {
            loadstart: () => log('loadstart'),
            loadedmetadata: () => log('loadedmetadata'),
            canplay: () => log('canplay'),
            playing: () => log('playing'),
            waiting: () => log('waiting'),
            stalled: () => log('stalled'),
            suspend: () => log('suspend'),
            ended: () => log('ended'),
            error: onError,
        };
        Object.entries(handlers).forEach(([evt, fn]) => video.addEventListener(evt, fn));

        video.muted = true;
        video.playsInline = true;

        let hls: Hls | undefined;

        const isM3U8 = /\.m3u8(\?|$)/i.test(src);

        if (video.canPlayType('application/vnd.apple.mpegurl') && isM3U8) {
            video.src = src;
            video.play().catch(() => {});
        } else if (Hls.isSupported() && isM3U8) {
            hls = new Hls({ enableWorker: true, debug: true });
            hls.loadSource(src);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_LOADING, (_e, d) => console.log('[HLS] MANIFEST_LOADING', d));
            hls.on(Hls.Events.MANIFEST_PARSED, (_e, d) => {
                console.log('[HLS] MANIFEST_PARSED', d);
                video.play().catch(() => {});
            });
            hls.on(Hls.Events.LEVEL_LOADED, (_e, d) => console.log('[HLS] LEVEL_LOADED', d.details?.live ? 'live' : 'vod', d));
            hls.on(Hls.Events.FRAG_LOADED, (_e, d) => console.log('[HLS] FRAG_LOADED', d.frag.sn, d.frag.relurl));
            hls.on(Hls.Events.ERROR, (_e, data) => {
                console.error('[HLS ERROR]', data.type, data.details, data);
                if (data.fatal) {
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls!.startLoad();
                    else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls!.recoverMediaError();
                    else hls!.destroy();
                }
            });
        } else {
            console.warn('[PLAYER] Not HLS source(Raw TS?).', src);
            video.src = src;
            video.play().catch(() => {});
        }

        const watchdog = setTimeout(() => {
            console.warn('[PLAYER] No progress after 8s.');
        }, 8000);

        const clearAll = () => {
            clearTimeout(watchdog);
            Object.entries(handlers).forEach(([evt, fn]) => video.removeEventListener(evt, fn));
            if (hls) hls.destroy();
        };
        return clearAll;
    }, [src]);

    return (
        <video
            ref={videoRef}
            poster={poster}
            controls
            autoPlay
            muted
            playsInline
            preload="auto"
            style={{ width: '100%', height: 'auto', borderRadius: 12 }}
        />
    );
}
