import React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Rating from "@mui/material/Rating";
import Alert from "@mui/material/Alert";

/**
 * Requirement: a genuinely 1:1 federation example, contrasting with
 * InventorySection.jsx's 1:many. `rating` arrives in the SAME
 * PRODUCT_QUERY response as `inventory` and everything else — Router
 * fetches product-service once, then Flattens to BOTH inventory-service
 * AND rating-service for their respective contributions, all within one
 * request from this component's point of view.
 *
 * No list rendering here — `rating` is a single object or null, so this
 * is a direct render, not a .map(). A brand-new product genuinely has no
 * rating record yet (nothing to divide by), which is exactly why the
 * schema makes Product.rating nullable rather than defaulting to some
 * placeholder average.
 */
export default function RatingSection({ rating }) {
  if (!rating) {
    return (
      <Alert severity="info" sx={{ mt: 3 }}>
        No reviews yet for this product.
      </Alert>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Rating
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Rating value={rating.averageRating} precision={0.1} readOnly />
        <Typography variant="body2" color="text.secondary">
          {rating.averageRating.toFixed(1)} ({rating.reviewCount} {rating.reviewCount === 1 ? "review" : "reviews"})
        </Typography>
      </Box>
    </Paper>
  );
}
