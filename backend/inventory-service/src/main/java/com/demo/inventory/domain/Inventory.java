package com.demo.inventory.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Table("inventory")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Inventory {

    // Genuinely 1:many now: a product can have several Inventory rows
    // (one per warehouse), so this needs its own generated identity —
    // productId is no longer unique enough to serve as the primary key.
    @Id
    private UUID id;

    @Column("product_id")
    private UUID productId;

    @Column("quantity_available")
    private Integer quantityAvailable;

    @Column("quantity_reserved")
    private Integer quantityReserved;

    @Column("warehouse_location")
    private String warehouseLocation;

    @Column("last_restocked_at")
    private OffsetDateTime lastRestockedAt;
}
