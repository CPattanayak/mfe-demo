package com.demo.inventory.repository;

import com.demo.inventory.domain.Inventory;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

import java.util.Collection;
import java.util.UUID;

@Repository
public interface InventoryRepository extends ReactiveCrudRepository<Inventory, UUID> {

    // The actual DataLoader-equivalent fix: batches ALL product ids
    // needing inventory resolution into ONE query, instead of one query
    // per product (see ProductInventoryResolver.java's @BatchMapping,
    // which is what calls this). Deliberately "IN (:ids)", not
    // "= ANY(:ids)" — the same fix already applied to product-service's
    // ProductRepository.findAllByIdIn for the identical reason: IN is
    // Spring Data R2DBC's officially documented, reliably-expanding
    // Collection parameter binding; ANY() depends on ambiguous
    // array-type coercion that silently matched nothing there.
    //
    // Can return MULTIPLE rows per product id now (one per warehouse) —
    // callers must group by productId themselves, not assume a 1:1
    // result shape.
    @Query("SELECT * FROM inventory WHERE product_id IN (:productIds)")
    Flux<Inventory> findAllByProductIdIn(Collection<UUID> productIds);

    @Query("SELECT * FROM inventory WHERE quantity_available < :threshold ORDER BY quantity_available ASC")
    Flux<Inventory> findAllBelowThreshold(int threshold);
}
