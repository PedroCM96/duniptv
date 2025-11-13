import {Box, Card, CardContent, CardHeader, IconButton, Typography} from "@mui/material";
import Player from "@/app/components/player";
import {RefObject} from "react";
import {Channel} from "@/app/types";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

type Props = {
    playerRef: RefObject<HTMLDivElement | null>;
    selectedChannel: Channel;
    onBackClick: () => void;
}
export default function PlayerCard({playerRef, selectedChannel, onBackClick}: Props) {
    return <Card ref={playerRef} sx={{scrollMarginTop: '80px'}}>
        <CardHeader
            avatar={
                <IconButton onClick={onBackClick} aria-label="back">
                    <ArrowBackIcon />
                </IconButton>
            }
            title={ selectedChannel.name}
        />
        <CardContent sx={{p: 0}}>
            {selectedChannel ? (
                <Box sx={{width: '100%'}}>
                    <Player src={selectedChannel.url} poster={selectedChannel.logo}/>
                </Box>
            ) : (
                <Box sx={{p: 2}}>
                    <Typography variant="body2" color="text.secondary">Select a channel to start player</Typography>
                </Box>
            )}
        </CardContent>
    </Card>
}