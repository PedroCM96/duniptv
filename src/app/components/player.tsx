'use client';
import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

type Props = { src?: string; poster?: string };

export default function Player({ src, poster }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastSrcRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return;

        if (lastSrcRef.current === src) return;
        lastSrcRef.current = src;

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

        const onVis = () => { if (document.hidden) { try { video.pause(); } catch {} } };
        document.addEventListener('visibilitychange', onVis);

        video.muted = true;
        video.playsInline = true;

        let hls: Hls | undefined;

        let errCount = 0;
        let windowStart = Date.now();
        const WINDOW_MS = 10_000;
        const MAX_ERR = 3;

        const stopPlayback = (reason: string) => {
            console.warn('[PLAYER] stopPlayback:', reason);
            try { hls?.destroy(); } catch {}
            try { video.removeAttribute('src'); video.load(); } catch {}
        };

        const getHttpStatus = (data: any): number | undefined => {
            return (
                data?.response?.code ??
                data?.response?.status ??
                data?.networkDetails?.status ??
                data?.xhr?.status
            );
        };

        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            video.play().catch(() => {});
        } else if (Hls.isSupported()) {
            const cfg: any = { enableWorker: true, debug: false };
            try {
                cfg.fragLoadPolicy = { default: { retry: { maxNumRetry: 1, retryDelayMs: 1500, maxRetryDelayMs: 4000 } } };
                cfg.manifestLoadPolicy = { default: { retry: { maxNumRetry: 1, retryDelayMs: 1500, maxRetryDelayMs: 4000 } } };
                cfg.playlistLoadPolicy = { default: { retry: { maxNumRetry: 1, retryDelayMs: 1500, maxRetryDelayMs: 4000 } } };
            } catch {}

            hls = new Hls(cfg);
            hls.loadSource(src);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('[HLS] MANIFEST_PARSED');
                video.play().catch(() => {});
            });
            hls.on(Hls.Events.FRAG_LOADED, (_e, d: any) => {
                errCount = 0;
                windowStart = Date.now();
            });

            hls.on(Hls.Events.ERROR, (_ev, data: any) => {
                console.error('[HLS ERROR]', data.type, data.details, data);

                const status = getHttpStatus(data);
                if (status === 401 || status === 403) {
                    stopPlayback(`HTTP ${status}`);
                    return;
                }

                const now = Date.now();
                if (now - windowStart > WINDOW_MS) {
                    windowStart = now; errCount = 0;
                }
                errCount++;

                if (errCount >= MAX_ERR) {
                    stopPlayback('too many errors');
                    return;
                }

                if (data.fatal) {
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        try { hls?.startLoad(); } catch {}
                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        try { hls?.recoverMediaError(); } catch {}
                    } else {
                        stopPlayback('fatal other');
                    }
                }
            });
        } else {
            console.warn('[PLAYER] No HLS source (.m3u8 required):', src);
        }

        const watchdog = setTimeout(() => {
            console.warn('[PLAYER] No progress after 8s.');
        }, 8000);

        return () => {
            clearTimeout(watchdog);
            document.removeEventListener('visibilitychange', onVis);
            Object.entries(handlers).forEach(([evt, fn]) => video.removeEventListener(evt, fn));
            try { hls?.destroy(); } catch {}
        };
    }, [src]);

    return (
        <video
            ref={videoRef}
            poster={poster}
            controls
            autoPlay
            muted
            playsInline
            preload="metadata"
            style={{ width: '100%', height: 'auto', borderRadius: 12 }}
        />
    );
}
