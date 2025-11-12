'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box, Button, Card, CardContent, CardHeader, Chip, CircularProgress, Container, Stack, TextField, Typography,
    Avatar, Alert, Pagination, FormControl, Select, MenuItem, InputLabel, InputAdornment, IconButton, Divider, Grid,
    Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import Player from '@/app/components/player';

type Channel = { name: string; url: string; logo?: string; group?: string; };
type PlaylistMeta = { listName: string; listUrl: string; channelCount: number };

const LS_INDEX_KEY = 'iptv_playlists_index_v1';
function channelsKey(listName: string) {
    return `iptv_channels::${listName}`;
}


function loadIndex(): PlaylistMeta[] {
    try {
        const raw = localStorage.getItem(LS_INDEX_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as PlaylistMeta[];
    } catch {
        return [];
    }
}

function saveIndex(index: PlaylistMeta[]) {
    const payload = JSON.stringify(index);
    localStorage.setItem(LS_INDEX_KEY, payload);
    const back = localStorage.getItem(LS_INDEX_KEY);
    if (back !== payload) throw new Error('Verification failed writing index');
}

function loadChannels(listName: string): Channel[] {
    try {
        const raw = localStorage.getItem(channelsKey(listName));
        if (!raw) return [];
        return JSON.parse(raw) as Channel[];
    } catch {
        return [];
    }
}

function saveChannels(listName: string, channels: Channel[]) {
    const payload = JSON.stringify(channels);
    localStorage.setItem(channelsKey(listName), payload); // puede lanzar quota
    const back = localStorage.getItem(channelsKey(listName));
    if (back !== payload) throw new Error('Verification failed writing channels');
}

function deletePlaylistStorage(listName: string) {
    try { localStorage.removeItem(channelsKey(listName)); } catch {}
    try {
        const idx = loadIndex().filter(p => p.listName !== listName);
        saveIndex(idx);
    } catch {}
}

export default function Home() {
    const [index, setIndex] = useState<PlaylistMeta[]>([]);
    const [selectedList, setSelectedList] = useState<PlaylistMeta | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [listName, setListName] = useState('');
    const [m3uUrl, setM3uUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [persistError, setPersistError] = useState<string | null>(null);

    const [channels, setChannels] = useState<Channel[]>([]);
    const [current, setCurrent] = useState<Channel | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [filter, setFilter] = useState('');

    const playerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const idx = loadIndex();
        setIndex(idx);
        setShowForm(idx.length === 0);
    }, []);


    useEffect(() => {
        if (!selectedList) return;
        const ch = loadChannels(selectedList.listName);
        setChannels(ch);
        setCurrent(null);
        setSelectedGroup(null);
        setFilter('');
        setPage(1);
    }, [selectedList]);

    useEffect(() => {
        if (current) playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [current]);

    const parseAndPersist = async (name: string, url: string) => {
        setLoading(true);
        setError(null);
        setPersistError(null);
        try {
            const res = await fetch('/api/parse', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ url }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Cannot parse M3U');

            const ch: Channel[] = data.channels ?? [];
            saveChannels(name, ch);
            const nextIdx = (() => {
                const existing = index.find(i => i.listName === name);
                if (existing) {
                    return index.map(i => i.listName === name ? { listName: name, listUrl: url, channelCount: ch.length } : i);
                }
                return [{ listName: name, listUrl: url, channelCount: ch.length }, ...index];
            })();
            saveIndex(nextIdx);

            setIndex(nextIdx);
            setSelectedList({ listName: name, listUrl: url, channelCount: ch.length });
            setChannels(ch);
            setShowForm(false);
        } catch (e: any) {
            if (e?.name === 'QuotaExceededError' || /quota|storage/i.test(String(e))) {
                setPersistError('No enough storage (limit ~5 MB). Delete lists.');
            } else {
                setError(e?.message ?? 'Error');
            }
        } finally {
            setLoading(false);
        }
    };

    const onCreatePlaylist = async () => {
        const name = listName.trim();
        const url = m3uUrl.trim();
        if (!name) { setError('Playlist name is missing'); return; }
        if (!url) { setError('Playlist url is missing'); return; }
        await parseAndPersist(name, url);
    };

    const onRefreshPlaylist = async (pl: PlaylistMeta) => {
        await parseAndPersist(pl.listName, pl.listUrl);
    };

    const onDeletePlaylist = (pl: PlaylistMeta) => {
        if (!confirm(`Delete playlist "${pl.listName}"?`)) return;
        deletePlaylistStorage(pl.listName);
        const nextIdx = index.filter(i => i.listName !== pl.listName);
        setIndex(nextIdx);
        if (selectedList?.listName === pl.listName) {
            setSelectedList(null);
            setChannels([]);
            setCurrent(null);
            setSelectedGroup(null);
            setFilter('');
            setPage(1);
        }
    };

    const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

    const groups = useMemo(() => {
        const map = new Map<string, number>();
        for (const ch of channels) {
            const g = (ch.group?.trim() || 'No group');
            map.set(g, (map.get(g) || 0) + 1);
        }
        return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
    }, [channels]);

    const filteredChannels = useMemo(() => {
        let list = channels;
        if (selectedGroup) {
            const g = selectedGroup === 'Sin grupo' ? '' : selectedGroup;
            list = list.filter(ch => (ch.group?.trim() || 'Sin grupo') === (g || 'Sin grupo'));
        }
        const f = norm(filter);
        if (!f) return list;
        return list.filter(ch => norm(ch.name || '').includes(f));
    }, [channels, selectedGroup, filter]);

    const totalPages = Math.max(1, Math.ceil(filteredChannels.length / pageSize));
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = useMemo(() => filteredChannels.slice(start, end), [filteredChannels, start, end]);

    useEffect(() => { setPage(1); }, [filter, selectedGroup]);

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Stack spacing={3}>
                {!selectedList && (
                    <Card>
                        <CardHeader
                            title="IPTV lists"
                            action={
                                <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setShowForm(s => !s)}>
                                    {showForm ? 'Close' : 'New playlist'}
                                </Button>
                            }
                        />
                        <CardContent>
                            {index.length === 0 && !showForm && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    No playlist saved. Create a new one.
                                </Alert>
                            )}

                            {index.length > 0 && (
                                <Stack spacing={1} sx={{ mb: 3 }}>
                                    {index.map((pl) => (
                                        <Stack
                                            key={pl.listName}
                                            direction="row"
                                            spacing={2}
                                            alignItems="center"
                                            sx={{
                                                border: '1px solid', borderColor: 'divider', px: 1.5, py: 1.25, borderRadius: 1,
                                            }}
                                        >
                                            <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                                                 onClick={() => setSelectedList(pl)}>
                                                <Typography variant="subtitle1" noWrap title={pl.listName}>
                                                    {pl.listName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap title={pl.listUrl}>
                                                    {pl.listUrl}
                                                </Typography>
                                            </Box>
                                            <Chip label={`${pl.channelCount} channels`} size="small" sx={{ mr: 1 }} />
                                            <IconButton aria-label="refresh" title="Refresh list" onClick={() => onRefreshPlaylist(pl)}>
                                                <RefreshIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton aria-label="delete" title="Delete list" onClick={() => onDeletePlaylist(pl)}>
                                                <DeleteIcon fontSize="small" color="error" />
                                            </IconButton>
                                        </Stack>
                                    ))}
                                </Stack>
                            )}
                            {showForm && (
                                <Stack spacing={2}>
                                    <Grid container spacing={2}>
                                        <TextField
                                            fullWidth label="List name" placeholder="My IPTV"
                                            value={listName} onChange={(e) => setListName(e.target.value)}
                                        />
                                        <TextField
                                            fullWidth label="Playlist URL (M3U)" placeholder="https://example.com/list.m3u"
                                            value={m3uUrl} onChange={(e) => setM3uUrl(e.target.value)}
                                        />
                                    </Grid>
                                    <Box>
                                        <Button variant="contained" onClick={onCreatePlaylist} disabled={!listName || !m3uUrl || loading}>
                                            {loading ? <CircularProgress size={22} /> : 'Create and load'}
                                        </Button>{' '}
                                        {index.length > 0 && (
                                            <Button variant="text" onClick={() => setShowForm(false)}>Cancel</Button>
                                        )}
                                    </Box>
                                    {error && <Alert severity="error">{error}</Alert>}
                                    {persistError && <Alert severity="warning">{persistError}</Alert>}
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                )}
                {selectedList && (
                    <>
                        <Card>
                            <CardHeader
                                title={selectedList.listName}
                                subheader={selectedList.listUrl}
                                action={
                                    <Button startIcon={<PlaylistPlayIcon />} onClick={() => {
                                        setSelectedList(null);
                                        setCurrent(null);
                                        setSelectedGroup(null);
                                        setFilter('');
                                    }}>
                                        Change playlist
                                    </Button>
                                }
                            />
                            <CardContent>
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography variant="subtitle2">Groups ({groups.length})</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Stack direction="row" flexWrap="wrap" gap={1}>
                                            {groups.map(g => (
                                                <Chip
                                                    key={g.name}
                                                    label={`${g.name} (${g.count})`}
                                                    color={selectedGroup === g.name ? 'primary' : 'default'}
                                                    onClick={() => setSelectedGroup(prev => (prev === g.name ? null : g.name))}
                                                    clickable
                                                />
                                            ))}
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
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
                                            Select a channel to start player
                                        </Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader
                                title="Channels"
                                subheader={
                                    `${filteredChannels.length} of ${channels.length} results` +
                                    (selectedGroup ? ` • Group: ${selectedGroup}` : '')
                                }
                                action={
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <InputLabel id="page-size-label">Per page</InputLabel>
                                        <Select
                                            labelId="page-size-label" label="Per page" value={pageSize}
                                            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
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
                                        fullWidth size="small" label="Filter by channel name" value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        InputProps={{
                                            startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>),
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
                                    <Typography variant="body2" color="text.secondary">No channels</Typography>
                                ) : (
                                    <>
                                        <Stack spacing={0}>
                                            {pageItems.map((ch, i) => (
                                                <Stack
                                                    key={`${ch.url}-${i}`}
                                                    direction="row" spacing={2} alignItems="center"
                                                    sx={{ cursor: 'pointer', '&:hover': { opacity: 0.9 },
                                                        borderTop: '1px solid', borderColor: 'divider', px: 1.5, py: 1.25 }}
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetch('/api/resolve', {
                                                                method: 'POST',
                                                                headers: { 'content-type': 'application/json' },
                                                                body: JSON.stringify({ url: ch.url }),
                                                            });
                                                            const data = await res.json();
                                                            if (!res.ok) throw new Error(data?.error || 'Cannot resolve m3u8');
                                                            setCurrent({ ...ch, url: data.m3u8 });
                                                        } catch {
                                                            setCurrent(ch);
                                                        }
                                                    }}
                                                >
                                                    <Avatar src={ch.logo} alt={ch.name}>{ch.name?.slice(0, 1).toUpperCase()}</Avatar>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="subtitle1" noWrap title={ch.name}>{ch.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary" noWrap title={ch.url}>{ch.url}</Typography>
                                                    </Box>
                                                    {ch.group && <Chip size="small" label={ch.group} />}
                                                </Stack>
                                            ))}
                                        </Stack>

                                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                            <Pagination
                                                count={totalPages} page={page}
                                                onChange={(_, p) => setPage(p)} shape="rounded" color="primary"
                                                siblingCount={1} boundaryCount={1}
                                            />
                                        </Box>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Divider />
                    </>
                )}
            </Stack>
        </Container>
    );
}
