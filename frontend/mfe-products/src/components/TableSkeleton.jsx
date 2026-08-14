import React from "react";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Skeleton from "@mui/material/Skeleton";

/**
 * Content-shaped loading placeholder for a table body — replaces a
 * generic spinner with something that hints at the eventual layout,
 * reducing perceived load time and layout shift once real rows arrive.
 */
export default function TableSkeleton({ columns, rows = 5 }) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton variant="text" width={colIndex === columns - 1 ? "40%" : "70%"} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
