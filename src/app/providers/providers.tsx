'use client';

import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { useMemo } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
    const darkTheme = useMemo(() => createTheme({
        palette: {
            mode: 'dark',
            primary: {
                light: '#00ffa3',
                main: '#00ffa3',
                dark: '#00ffa3',
                contrastText: '#000',
            },
        },
    }), []);

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
}
