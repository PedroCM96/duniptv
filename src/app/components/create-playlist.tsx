import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Tabs,
  Tab,
  Typography,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { SyntheticEvent, useState } from 'react';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

type Props = {
  error: string | null;
  persistError: string | null;
  loading: boolean;
  onCreatePlaylist: (listName: string, m3url: string) => void;
  onCancel: () => void;
};
export default function CreatePlaylist({
  error,
  persistError,
  loading,
  onCreatePlaylist,
  onCancel,
}: Props) {
  const [listName, setListName] = useState('');
  const [m3uUrl, setM3uUrl] = useState('');
  const [host, setHost] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [currentTab, setCurrentTab] = useState<number>(0);

  const onTabChange = (_: SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const onCreate = () => {
    if (currentTab === 0) {
      onCreatePlaylist(listName, m3uUrl);
      return;
    }

    const url = `${host}/get.php?username=${username}&password=${password}&type=m3u_plus&output=mpegts`;
    onCreatePlaylist(listName, url);
  };

  const isButtonDisabled = (): boolean => {
    if (loading) {
      return true;
    }

    if (currentTab === 0) {
      return !m3uUrl || !listName;
    }

    return !listName || !host || !username || !password;
  };

  return (
    <Stack spacing={2}>
      <Typography variant={'subtitle1'} fontWeight={700}>
        Create new playlist
      </Typography>
      <Tabs value={currentTab} onChange={onTabChange}>
        <Tab label={'M3U Url'} />
        <Tab label={'Xtream Login'} />
      </Tabs>
      {currentTab === 0 && (
        <Grid container spacing={2}>
          <TextField
            fullWidth
            label="List name"
            placeholder="My IPTV"
            value={listName}
            onChange={e => setListName(e.target.value)}
          />
          <TextField
            fullWidth
            label="Playlist URL (M3U)"
            placeholder="https://example.com/list.m3u"
            value={m3uUrl}
            onChange={e => setM3uUrl(e.target.value)}
          />
        </Grid>
      )}
      {currentTab === 1 && (
        <Grid container spacing={2}>
          <TextField
            fullWidth
            label="List name"
            placeholder="My IPTV"
            value={listName}
            onChange={e => setListName(e.target.value)}
          />
          <TextField
            fullWidth
            label="Host"
            placeholder="http://example.com:8080"
            value={host}
            onChange={e => setHost(e.target.value)}
          />
          <TextField
            fullWidth
            label="User"
            placeholder="User123456"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <TextField
            fullWidth
            label="Password"
            placeholder="Password123456"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(prev => !prev)}
                    onMouseDown={e => e.preventDefault()} // para que no pierda el foco
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      )}

      <Box>
        <Button variant="contained" onClick={onCreate} disabled={isButtonDisabled()}>
          {loading ? <CircularProgress size={22} /> : 'Create and load'}
        </Button>{' '}
        <Button variant="text" onClick={onCancel}>
          Cancel
        </Button>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {persistError && <Alert severity="warning">{persistError}</Alert>}
    </Stack>
  );
}
