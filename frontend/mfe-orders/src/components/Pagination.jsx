import React from "react";
import Box from "@mui/material/Box";
import MuiPagination from "@mui/material/Pagination";

/**
 * hasNextPage is a heuristic (page came back full), since the backend
 * query returns a plain list, not a total count.
 */
export default function Pagination({ page, pageSize, itemCount, onPageChange }) {
  const hasNextPage = itemCount === pageSize;
  const count = page + 1 + (hasNextPage ? 1 : 0);

  if (page === 0 && !hasNextPage) return null;

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
      <MuiPagination
        page={page + 1}
        count={count}
        onChange={(_, value) => onPageChange(value - 1)}
        color="primary"
      />
    </Box>
  );
}
