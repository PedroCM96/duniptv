import {Box, Button, Card, CardContent, CardHeader, Stack, Typography, Chip} from "@mui/material";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import {PlaylistMeta} from "@/app/types";

type Props = {
    groups: Array<{name: string, count: number}>
    selectedPlaylist: PlaylistMeta;
    onChangePlaylist: () => void;
    onGroupSelected: (group: string) => void;

}
export default function GroupList({groups, selectedPlaylist, onChangePlaylist, onGroupSelected}: Props) {

    return  <Card>
        <CardContent>
            <Stack spacing={2}>
                <Stack direction={'row'}>
                    <Stack width={'70%'}>
                        <Typography variant="h4" noWrap title={selectedPlaylist.listName}>{selectedPlaylist.listName}</Typography>
                        <Typography variant="body1" noWrap title={selectedPlaylist.listUrl}>{selectedPlaylist.listUrl}</Typography>
                    </Stack>
                    <Stack width={'100%'}>
                        <Button startIcon={<PlaylistPlayIcon />} onClick={onChangePlaylist}>
                            Change playlist
                        </Button>
                    </Stack>
                </Stack>
                <Stack spacing={0}>
                    {groups.map((group, i) => (
                        <Stack
                            key={`${group.name}-${i}`}
                            direction="row" spacing={2} alignItems="center"
                            sx={{ cursor: 'pointer', '&:hover': { opacity: 0.9 },
                                borderTop: '1px solid', borderColor: 'divider', px: 1.5, py: 1.25 }}
                            onClick={() => onGroupSelected(group.name)}

                        >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle1" noWrap title={group.name}>{group.name}</Typography>
                            </Box>
                            <Chip label={`${group.count}`}></Chip>
                        </Stack>
                    ))}
                </Stack>
            </Stack>
        </CardContent>
    </Card>
}