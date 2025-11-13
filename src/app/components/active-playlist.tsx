import { Divider, Stack, Typography, Card } from '@mui/material';
import Image from 'next/image';
import { Channel, PlaylistMeta } from '@/app/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { dbLoadChannels } from '@/app/indexdb';
import ChannelList from '@/app/components/channel-list';
import GroupList from '@/app/components/group-list';
import PlayerCard from '@/app/components/player-card';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useIsMobile } from '@/app/hooks/mobile';
import AnimatedColumn from '@/app/components/animated-column';

type Props = {
  selectedPlaylist: PlaylistMeta;
  onChangePlaylist: () => void;
};

export default function ActivePlaylist({ selectedPlaylist, onChangePlaylist }: Props) {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);

  const playerRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();

  useEffect(() => {
    if (!selectedPlaylist) return;
    (async () => {
      const ch = await dbLoadChannels(selectedPlaylist.listName);
      setChannels(ch);
      setSelectedChannel(null);
      setSelectedGroup(null);
    })();
  }, [selectedPlaylist]);

  useEffect(() => {
    if (selectedChannel) playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedChannel]);

  const onChangePlaylistClicked = () => {
    onChangePlaylist();
    setSelectedChannel(null);
  };

  const groups = useMemo(() => {
    const map = new Map<string, number>();
    for (const ch of channels) {
      const g = ch.group?.trim() || 'No group';
      map.set(g, (map.get(g) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [channels]);

  const onChannelLoaded = (ch: Channel) => {
    setSelectedChannel(ch);
  };

  const onGroupSelected = (group: string) => {
    setSelectedGroup(prev => (prev === group ? null : group));
  };

  const groupChannels: Array<Channel> = selectedGroup
    ? channels.filter(c => c.group?.toLowerCase() === selectedGroup.toLowerCase())
    : [];

  const showGroups = isMobile ? selectedGroup === null : true;
  const showChannels = isMobile ? selectedChannel === null : !!selectedGroup;
  const showPlayer = isMobile
    ? selectedGroup !== null && selectedChannel !== null
    : !!selectedChannel;

  const onChannelsBackClick = () => {
    setSelectedChannel(null);
    setSelectedGroup(null);
  };

  const onBackClick = () => {
    setSelectedChannel(null);
  };

  return (
    <Stack spacing={3} width={'100%'} boxSizing={'border-box'}>
      <Stack alignItems={'center'} flexDirection={'row'} gap={1} justifyContent={'space-between'}>
        <Stack
          content={'center'}
          alignItems={'center'}
          flexDirection={'row'}
          gap={1}
          justifyContent={'center'}
        >
          <Image unoptimized src={'/logo.png?v=2'} alt={'DUNIPTV'} width={50} height={50} />
          <Typography fontWeight={700} color={'primary'}>
            DUNIPTV
          </Typography>
        </Stack>
        <GitHubIcon
          color={'primary'}
          fontSize={'large'}
          onClick={() => window.open('https://github.com/PedroCM96/duniptv')}
          sx={{
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.1)',
            },
          }}
        />
      </Stack>
      {isMobile && (
        <>
          {showGroups && (
            <GroupList
              groups={groups}
              selectedPlaylist={selectedPlaylist}
              onChangePlaylist={onChangePlaylistClicked}
              onGroupSelected={onGroupSelected}
            />
          )}
          {showChannels && !!selectedGroup && (
            <ChannelList
              onBackClick={onChannelsBackClick}
              channels={groupChannels}
              onChannelLoaded={onChannelLoaded}
              selectedGroupName={selectedGroup}
            />
          )}
          {showPlayer && !!selectedChannel && (
            <PlayerCard
              playerRef={playerRef}
              selectedChannel={selectedChannel}
              onBackClick={onBackClick}
            />
          )}
        </>
      )}
      {!isMobile && (
        <>
          <Stack flexDirection={'row'} boxSizing={'border-box'} width={'100%'} flex={1} gap={1}>
            <AnimatedColumn visible={showGroups} targetWidth={'30%'}>
              <GroupList
                groups={groups}
                selectedPlaylist={selectedPlaylist}
                onChangePlaylist={onChangePlaylistClicked}
                onGroupSelected={onGroupSelected}
              />
            </AnimatedColumn>
            <AnimatedColumn visible={showChannels && !!selectedGroup} targetWidth={'30%'}>
              <ChannelList
                onBackClick={onChannelsBackClick}
                channels={groupChannels}
                onChannelLoaded={onChannelLoaded}
                selectedGroupName={selectedGroup ?? ''}
              />
            </AnimatedColumn>
            <AnimatedColumn visible={showPlayer && !!selectedChannel} targetWidth={'40%'}>
              <PlayerCard
                playerRef={playerRef}
                selectedChannel={selectedChannel ?? { name: '', url: '', group: '', logo: '' }}
                onBackClick={onBackClick}
              />
            </AnimatedColumn>
            {(!showChannels || !showPlayer) && (
              <Stack direction="column" flex={1} width="100%">
                <Card sx={{ display: 'flex', flex: 1, justifyContent: 'center', padding: '40px' }}>
                  <Typography variant="subtitle1" noWrap>
                    {'Select a group, then a channel and start watching.'}
                  </Typography>
                </Card>
              </Stack>
            )}
          </Stack>
        </>
      )}
      <Divider />
    </Stack>
  );
}
