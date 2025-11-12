'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box, Button, Card, CardContent, CardHeader, Chip,
    CircularProgress, Container, Stack, TextField, Typography,
    Avatar, Alert, Pagination, FormControl, Select, MenuItem, InputLabel,
    InputAdornment, IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import Player from "@/app/components/player";

type Channel = {
    name: string;
    url: string;
    logo?: string;
    group?: string;
};

export default function Home() {
    const [m3uUrl, setM3uUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [current, setCurrent] = useState<Channel | null>(null);

    const [page, setPage] = useState(1);          // 1-based
    const [pageSize, setPageSize] = useState(50); // 20 / 50 / 100

    const [filter, setFilter] = useState('');

    const playerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (current) {
            playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [current]);

    const onParse = async () => {
        setLoading(true);
        setError(null);
        setChannels([]);
        setCurrent(null);
        try {
            const res = await fetch('/api/parse', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ url: m3uUrl }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Parsing error');
            setChannels(data.channels as Channel[]);
            if (data.channels.length) setCurrent(data.channels[0]);
            setPage(1);
        } catch (e) {
            setError((e as { message?: string })?.message ?? 'Error');
        } finally {
            setLoading(false);
        }
    };

    const norm = (s: string) =>
        s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

    const filteredChannels = useMemo(() => {
        const f = norm(filter);
        if (!f) return channels;
        return channels.filter(ch => norm(ch.name || '').includes(f));
    }, [channels, filter]);

    const totalPages = Math.max(1, Math.ceil(filteredChannels.length / pageSize));
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const pageItems = useMemo(
        () => filteredChannels.slice(start, end),
        [filteredChannels, start, end]
    );

    useEffect(() => { setPage(1); }, [filter]);

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Stack spacing={3}>
                <Card>
                    <CardHeader title="IPTV Player" />
                    <CardContent>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                fullWidth
                                label="Playlist URL"
                                placeholder="https://example.com/list.m3u"
                                value={m3uUrl}
                                onChange={(e) => setM3uUrl(e.target.value)}
                            />
                            <Button variant="contained" onClick={onParse} disabled={!m3uUrl || loading}>
                                {loading ? <CircularProgress size={22} /> : 'Load'}
                            </Button>
                        </Stack>
                        {error && (
                            <Box mt={2}>
                                <Alert severity="error">{error}</Alert>
                            </Box>
                        )}
                    </CardContent>
                </Card>

                <Card ref={playerRef} sx={{ scrollMarginTop: '80px' }}>
                    <CardHeader title={current ? current.name : 'Player'} />
                    <CardContent sx={{ p: 0 }}>
                        {current ? (
                            <Box sx={{ width: '100%' }}>
                                <Player src={current.url} poster={current.logo} />
                            </Box>
                        ) : (
                            <Box sx={{ p: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Load a list and select a channel
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader
                        title="Channels"
                        subheader={`${filteredChannels.length} of ${channels.length} results • Page ${page} / ${totalPages}`}
                        action={
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel id="page-size-label">Per page</InputLabel>
                                <Select
                                    labelId="page-size-label"
                                    label="Per page"
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPage(1);
                                    }}
                                >
                                    <MenuItem value={20}>20</MenuItem>
                                    <MenuItem value={50}>50</MenuItem>
                                    <MenuItem value={100}>100</MenuItem>
                                </Select>
                            </FormControl>
                        }
                    />
                    <CardContent>
                        <Box sx={{ mb: 2 }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Filter by channel name"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: filter ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setFilter('')} aria-label="clear filter">
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : undefined,
                                }}
                            />
                        </Box>

                        {filteredChannels.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                No channels found
                            </Typography>
                        ) : (
                            <Stack spacing={0}>
                                {pageItems.map((ch, i) => (
                                    <Stack
                                        key={`${ch.url}-${i}`}
                                        direction="row"
                                        spacing={2}
                                        alignItems="center"
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': { opacity: 0.9 },
                                            borderTop: '1px solid',
                                            borderColor: 'divider',
                                            px: 1.5,
                                            py: 1.25,
                                        }}
                                        onClick={async () =>{
                                            const base = ch.url;
                                            const res = await fetch('/api/resolve', {
                                                method: 'POST',
                                                headers: { 'content-type': 'application/json' },
                                                body: JSON.stringify({ url: base }),
                                            });
                                            const data = await res.json();
                                            if (!res.ok) throw new Error(data?.error || 'Cannot resolve m3u');
                                            setCurrent({ ...ch, url: data.m3u8 });
                                        }}
                                    >
                                        <Avatar src={ch.logo} alt={ch.name}>
                                            {ch.name?.slice(0, 1).toUpperCase()}
                                        </Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="subtitle1" noWrap title={ch.name}>
                                                {ch.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap title={ch.url}>
                                                {ch.url}
                                            </Typography>
                                        </Box>
                                        {ch.group && <Chip size="small" label={ch.group} />}
                                    </Stack>
                                ))}

                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                    <Pagination
                                        count={totalPages}
                                        page={page}
                                        onChange={(_, p) => setPage(p)}
                                        shape="rounded"
                                        color="primary"
                                        siblingCount={1}
                                        boundaryCount={1}
                                    />
                                </Box>
                            </Stack>
                        )}
                    </CardContent>
                </Card>
            </Stack>
        </Container>
    );
}
