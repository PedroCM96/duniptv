'use client';

import { useState } from 'react';
import { Stack } from '@mui/material';
import { PlaylistMeta } from '@/app/types';
import ListSelector from '@/app/components/list-selector';
import ActivePlaylist from '@/app/components/active-playlist';

export default function Home() {
  const [selectedList, setSelectedList] = useState<PlaylistMeta | null>(null);

  const onChangePlaylist = () => {
    setSelectedList(null);
  };

  return (
    <Stack
      flexDirection={'row'}
      paddingX={3}
      paddingY={4}
      boxSizing={'border-box'}
      justifyContent={'center'}
    >
      <Stack maxWidth={'1920px'} width={'100%'} alignItems={'center'}>
        {!selectedList && (
          <ListSelector
            onPlayListSelected={pl => {
              setSelectedList(pl);
            }}
          />
        )}

        {selectedList && (
          <ActivePlaylist selectedPlaylist={selectedList} onChangePlaylist={onChangePlaylist} />
        )}
      </Stack>
    </Stack>
  );
}
