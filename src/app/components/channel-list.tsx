import { Channel } from '@/app/types';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useEffect, useMemo, useState } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

type Props = {
  channels: Channel[];
  onChannelLoaded: (channel: Channel) => void;
  selectedGroupName: string;
  onBackClick: () => void;
};

export default function ChannelList({
  channels,
  onChannelLoaded,
  selectedGroupName,
  onBackClick,
}: Props) {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();

  const filteredChannels = useMemo(() => {
    const list = channels;
    const f = norm(filter);
    if (!f) return list;
    return list.filter(ch => norm(ch.name || '').includes(f));
  }, [channels, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredChannels.length / pageSize));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = useMemo(
    () => filteredChannels.slice(start, end),
    [filteredChannels, start, end],
  );

  const loadChannel = async (ch: Channel) => {
    try {
      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: ch.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Cannot resolve m3u8');

      const secureM3u8 = `/api/proxy?url=${encodeURIComponent(data.m3u8)}`;
      onChannelLoaded({ ...ch, url: secureM3u8 });
    } catch {
      const secureM3u8 = `/api/proxy?url=${encodeURIComponent(ch.url)}`;
      onChannelLoaded({ ...ch, url: secureM3u8 });
    }
  };
  return (
    <Card>
      <CardHeader
        title="Channels"
        avatar={
          <IconButton onClick={onBackClick} aria-label="back">
            <ArrowBackIcon />
          </IconButton>
        }
        subheader={`${filteredChannels.length} of ${channels.length} results • Group: ${selectedGroupName}`}
        action={
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="page-size-label">Per page</InputLabel>
            <Select
              labelId="page-size-label"
              label="Per page"
              value={pageSize}
              onChange={e => {
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
            onChange={e => setFilter(e.target.value)}
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
            No channels
          </Typography>
        ) : (
          <>
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
                  onClick={() => loadChannel(ch)}
                >
                  <Avatar src={ch.logo} alt={ch.name}>
                    {ch.name?.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap title={ch.name}>
                      {ch.name}
                    </Typography>
                    <Typography
                      sx={{
                        display: 'block',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      title={ch.url}
                    >
                      {ch.url}
                    </Typography>
                  </Box>
                  {ch.group && <Chip size="small" label={ch.group} />}
                </Stack>
              ))}
            </Stack>

            <Box sx={{ display: 'res', justifyContent: 'center', py: 2 }}>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
