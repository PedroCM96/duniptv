import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip, CircularProgress,
    Grid,
    IconButton,
    Stack, TextField,
    Typography
} from "@mui/material";
import Image from "next/image";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import {useEffect, useState} from "react";
import {Channel, PlaylistMeta} from "@/app/types";
import {dbLoadIndex, dbPutPlaylist, idbOpen, idbTxComplete, STORE_CHANNELS, STORE_PLAYLISTS} from "@/app/indexdb";

type Props = {
    onPlayListSelected: (pl: PlaylistMeta) => void;
}
export default function ListSelector({onPlayListSelected}: Props) {
    const [showForm, setShowForm] = useState(false);
    const [index, setIndex] = useState<PlaylistMeta[]>([]);

    const [listName, setListName] = useState('');
    const [m3uUrl, setM3uUrl] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [persistError, setPersistError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const idx = await dbLoadIndex();
                setIndex(idx);
                setShowForm(idx.length === 0);
            } catch {
                setPersistError('Error opening storage');
            }
        })();
    }, []);

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
            const meta: PlaylistMeta = { listName: name, listUrl: url, channelCount: ch.length };
            await dbPutPlaylist(meta, ch);
            const nextIdx = await dbLoadIndex();
            setIndex(nextIdx);
            setShowForm(false);
        } catch {
            setError('Error');
        } finally {
            setLoading(false);
        }
    };

    const onCreatePlaylist = async (listName: string, m3uUrl: string) => {
        const name = listName.trim();
        const url = m3uUrl.trim();
        if (!name) { setError('Playlist name is missing'); return; }
        if (!url) { setError('Playlist url is missing'); return; }
        await parseAndPersist(name, url);
    };

    const onRefreshPlaylist = async (pl: PlaylistMeta) => {
        await parseAndPersist(pl.listName, pl.listUrl);
    };

    const onDeletePlaylist = async (pl: PlaylistMeta) => {
        if (!confirm(`Delete playlist "${pl.listName}"?`)) return;
        try {
            const db = await idbOpen();
            const tx = db.transaction([STORE_PLAYLISTS, STORE_CHANNELS], 'readwrite');
            tx.objectStore(STORE_PLAYLISTS).delete(pl.listName);
            tx.objectStore(STORE_CHANNELS).delete(pl.listName);
            await idbTxComplete(tx);
            db.close();

            const nextIdx = await dbLoadIndex();
            setIndex(nextIdx);
        } catch {
            setPersistError('Error deleting playlist');
        }
    };


    return <Stack spacing={3} maxWidth={'800px'} width={'100%'}>
        <Stack content={'center'} alignItems={'center'}>
            <Image unoptimized src={'/logo.png?v=2'} alt={'DUNIPTV'} width={400} height={400}/>
            <Typography variant={'h3'} fontWeight={700} color={"#00ffa3"}>DUNIPTV</Typography>
        </Stack>
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
                                sx={{ border: '1px solid', borderColor: 'divider', px: 1.5, py: 1.25, borderRadius: 1 }}
                            >
                                <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onPlayListSelected(pl)}>
                                    <Typography variant="subtitle1" noWrap title={pl.listName}>{pl.listName}</Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap title={pl.listUrl} sx={{
                                        display: 'block',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap',
                                        textOverflow: 'ellipsis',
                                    }}>{pl.listUrl}</Typography>
                                </Box>
                                <Chip label={`${pl.channelCount} channels`} size="small" sx={{ mr: 1 }} />
                                <Stack direction={'row'} spacing={0}>
                                    <IconButton aria-label="refresh" title="Refresh list" onClick={() => onRefreshPlaylist(pl)}>
                                        <RefreshIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton aria-label="delete" title="Delete list" onClick={() => onDeletePlaylist(pl)}>
                                        <DeleteIcon fontSize="small" color="error" />
                                    </IconButton>
                                </Stack>
                            </Stack>
                        ))}
                    </Stack>
                )}

                {showForm && (
                    <Stack spacing={2}>
                        <Grid container spacing={2}>
                            <TextField fullWidth label="List name" placeholder="My IPTV" value={listName} onChange={(e) => setListName(e.target.value)} />
                            <TextField fullWidth label="Playlist URL (M3U)" placeholder="https://example.com/list.m3u" value={m3uUrl} onChange={(e) => setM3uUrl(e.target.value)} />
                        </Grid>
                        <Box>
                            <Button variant="contained" onClick={() => onCreatePlaylist(listName, m3uUrl)} disabled={!listName || !m3uUrl || loading}>
                                {loading ? <CircularProgress size={22} /> : 'Create and load'}
                            </Button>{' '}
                            {index.length > 0 && <Button variant="text" onClick={() => setShowForm(false)}>Cancel</Button>}
                        </Box>
                        {error && <Alert severity="error">{error}</Alert>}
                        {persistError && <Alert severity="warning">{persistError}</Alert>}
                    </Stack>
                )}
            </CardContent>
        </Card>
    </Stack>
}