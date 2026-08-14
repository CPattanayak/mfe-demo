import React from "react";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";

/** Content-shaped loading placeholder matching OrderEdit's layout. */
export default function FormSkeleton() {
  return (
    <Stack spacing={1.5} sx={{ maxWidth: { xs: "100%", sm: 480, md: 640 } }}>
      <Skeleton variant="text" width={220} height={40} />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="rounded" width={220} height={56} sx={{ mt: 1 }} />
      <Skeleton variant="rounded" width={140} height={40} />
    </Stack>
  );
}
