import { createTheme } from "@mui/material/styles";

// Default MUI breakpoints (used implicitly everywhere sx={{ xs, sm, md,
// lg, xl }} appears throughout the app): xs 0px, sm 600px, md 900px,
// lg 1200px, xl 1536px. Declared explicitly here so they're easy to find
// and tune in one place rather than assumed implicitly.
export const theme = createTheme({
  palette: {
    primary: { main: "#1a73e8" },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});
