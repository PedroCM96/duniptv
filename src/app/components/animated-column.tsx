import { Stack, StackProps } from "@mui/material";

type Props = {
    visible: boolean;
    targetWidth: string;
} & StackProps;

export default function AnimatedColumn({ visible, targetWidth, children, ...rest }: Props) {
    return (
        <Stack
            {...rest}
            sx={{
                width: visible ? targetWidth : 0,
                opacity: visible ? 1 : 0,
                overflow: "hidden",
                transition: "width 0.3s ease, opacity 0.3s ease",
                pointerEvents: visible ? "auto" : "none",
                ...rest.sx,
            }}
        >
            {children}
        </Stack>
    );
}
