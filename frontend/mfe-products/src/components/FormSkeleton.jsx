import React from "react";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";

/** Content-shaped loading placeholder matching ProductForm's field layout. */
export default function FormSkeleton() {
  return (
    <Stack spacing={2} sx={{ maxWidth: { xs: "100%", sm: 480, md: 640 } }}>
      <Skeleton variant="text" width={220} height={40} />
      <Skeleton variant="rounded" height={56} />
      <Skeleton variant="rounded" height={56} />
      <Skeleton variant="rounded" height={84} />
      <Skeleton variant="rounded" height={56} />
      <Skeleton variant="rounded" width={140} height={40} />
    </Stack>
  );
}
