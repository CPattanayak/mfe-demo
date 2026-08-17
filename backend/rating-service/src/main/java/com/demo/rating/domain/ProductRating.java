package com.demo.rating.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Genuinely 1:1 with a product — contrast with inventory-service's
 * Inventory, which needed its own separate generated `id` because a
 * product can have MULTIPLE inventory rows. Here, productId itself is
 * the @Id: the database structurally cannot hold more than one rating
 * row per product, since that's the primary key.
 */
@Table("product_rating")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRating {

    @Id
    @Column("product_id")
    private UUID productId;

    @Column("average_rating")
    private BigDecimal averageRating;

    @Column("review_count")
    private Integer reviewCount;

    @Column("updated_at")
    private OffsetDateTime updatedAt;
}
