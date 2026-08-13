package com.demo.order.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.util.UUID;

@Table("order_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {

    @Id
    private UUID id;

    @Column("order_id")
    private UUID orderId;

    @Column("product_id")
    private UUID productId;

    private Integer quantity;

    @Column("unit_price_cents")
    private Long unitPriceCents;
}
