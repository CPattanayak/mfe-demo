package com.demo.inventory.graphql;

import com.demo.inventory.domain.Inventory;
import com.demo.inventory.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.federation.EntityMapping;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The canonical Apollo Federation "extend an entity you don't own"
 * pattern. This subgraph has no idea what a Product's name, price, or
 * SKU even is — it only ever sees a bare {@code id} and attaches
 * `inventory` to it. Two methods, working together:
 *
 * <ol>
 *   <li>{@code @EntityMapping product(idList)} — the REFERENCE resolver,
 *       in its BATCH form (a single call resolving every representation
 *       Router needs in this query, not one call per product). Doesn't
 *       touch the database — a bare {@link Product} wrapping
 *       each id is enough — but still avoids Spring making N separate
 *       reactive subscriptions to resolve N entity references
 *       one-by-one.</li>
 *   <li>{@code @BatchMapping(typeName = "Product", field = "inventory")}
 *       — THE actual DataLoader-equivalent fix. Resolves `inventory` for
 *       EVERY product in the batch with ONE query
 *       ({@code WHERE product_id IN (...)}), then groups results back
 *       per product — instead of one query per product (real N+1, easy
 *       to miss: a plain {@code @SchemaMapping} here looks identical in
 *       the schema but fires once per entity, silently). Same shape of
 *       fix as order-service's ProductBatchLoader.</li>
 * </ol>
 *
 * HONEST NOTE on "parallel calling": querying `product(id) { name price
 * inventory { quantityAvailable } }` through Router is NOT parallel — it's
 * Fetch (product-service, get id/name/price) then Flatten
 * (inventory-service, resolve inventory using that id). Router can't ask
 * this subgraph for inventory before it knows WHICH product's inventory
 * to look up. Genuine parallel execution is what FederationDemo.jsx's
 * DASHBOARD_QUERY does: fetching `products` and `orders` (and now
 * `lowStockInventory` — see below) as INDEPENDENT root fields that don't
 * depend on each other's results, which Router genuinely does run
 * concurrently. Batching (this file) and parallelism (that query) are two
 * DIFFERENT optimizations, easy to conflate — this service demonstrates
 * both, but they solve different problems.
 */
@Controller
@RequiredArgsConstructor
public class ProductInventoryResolver {

    private final InventoryRepository inventoryRepository;

    @EntityMapping
    public Flux<Product> product(@Argument List<String> idList) {
        return Flux.fromIterable(idList).map(Product::new);
    }

    @BatchMapping(typeName = "Product", field = "inventory")
    public Mono<Map<Product, List<Inventory>>> inventory(List<Product> products) {
        List<UUID> productIds = products.stream()
                .map(p -> UUID.fromString(p.id()))
                .distinct()
                .toList();

        return inventoryRepository.findAllByProductIdIn(productIds)
                .collectMultimap(inv -> inv.getProductId().toString())
                .map(grouped -> products.stream()
                        .collect(Collectors.toMap(
                                p -> p,
                                p -> new ArrayList<>(grouped.getOrDefault(p.id(), Collections.emptyList())))));
    }

    /** Direct lookup, bypassing the Product entity extension — one product's stock across all its warehouses. */
    @QueryMapping
    @PreAuthorize("hasRole('product:read')")
    public Flux<Inventory> inventoryForProduct(@Argument String productId) {
        return inventoryRepository.findAllByProductIdIn(List.of(UUID.fromString(productId)));
    }

    /** The genuinely parallel-friendly query — independent of any specific product. */
    @QueryMapping
    @PreAuthorize("hasRole('product:read')")
    public Flux<Inventory> lowStockInventory(@Argument int threshold) {
        return inventoryRepository.findAllBelowThreshold(threshold);
    }

    /**
     * Requirement: mutate inventory from the product edit screen. Gated
     * behind product:write — the same role that already gates
     * creating/editing products themselves (see ProductCreate.jsx/
     * ProductEdit.jsx's role guards), since this is reached from that
     * same page, not a separately-permissioned feature.
     */
    @MutationMapping
    @PreAuthorize("hasRole('product:write')")
    public Mono<Inventory> createInventory(@Argument CreateInventoryInput input) {
        Inventory inventory = Inventory.builder()
                // id deliberately left null — R2DBC treats a null @Id as
                // an INSERT and lets Postgres's own
                // "DEFAULT gen_random_uuid()" (see infra/postgres/init.sql)
                // generate it, same convention as every other entity in
                // this project that has a DB-generated primary key.
                .productId(UUID.fromString(input.productId()))
                .quantityAvailable(input.quantityAvailable())
                .quantityReserved(input.quantityReserved() != null ? input.quantityReserved() : 0)
                .warehouseLocation(input.warehouseLocation())
                .lastRestockedAt(OffsetDateTime.now())
                .build();
        return inventoryRepository.save(inventory);
    }

    @MutationMapping
    @PreAuthorize("hasRole('product:write')")
    public Mono<Inventory> updateInventory(@Argument String id, @Argument UpdateInventoryInput input) {
        return inventoryRepository.findById(UUID.fromString(id))
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Inventory record not found: " + id)))
                .flatMap(existing -> {
                    if (input.quantityAvailable() != null) {
                        existing.setQuantityAvailable(input.quantityAvailable());
                    }
                    if (input.quantityReserved() != null) {
                        existing.setQuantityReserved(input.quantityReserved());
                    }
                    if (input.warehouseLocation() != null) {
                        existing.setWarehouseLocation(input.warehouseLocation());
                    }
                    existing.setLastRestockedAt(OffsetDateTime.now());
                    return inventoryRepository.save(existing);
                });
    }

    @MutationMapping
    @PreAuthorize("hasRole('product:write')")
    public Mono<Boolean> deleteInventory(@Argument String id) {
        UUID uuid = UUID.fromString(id);
        return inventoryRepository.existsById(uuid)
                .flatMap(exists -> exists
                        ? inventoryRepository.deleteById(uuid).thenReturn(true)
                        : Mono.just(false));
    }

    public record CreateInventoryInput(
            String productId, Integer quantityAvailable, Integer quantityReserved, String warehouseLocation) {}

    public record UpdateInventoryInput(
            Integer quantityAvailable, Integer quantityReserved, String warehouseLocation) {}

    /**
     * Bare wrapper around a Product's id — all this subgraph knows or
     * needs to know about Product.
     *
     * MUST be named exactly "Product" (not e.g. "ProductReference") —
     * Spring GraphQL's federation type resolution appears to match a
     * returned Java object back to its GraphQL type by simple class
     * name when no explicit TypeResolver is configured. product-
     * service's own ProductEntityResolver happens to satisfy this by
     * coincidence (its real domain class is genuinely named Product);
     * this record is a synthetic stub with no domain meaning of its
     * own, so the name has to be chosen deliberately. Got this wrong
     * once — the original "ProductReference" name produced "Abstract
     * type '_Entity' must resolve to an Object type at runtime... Could
     * not determine the exact type of '_Entity'" at query time (schema
     * loaded fine; this only breaks once Router actually calls
     * _entities).
     */
    public record Product(String id) {}
}
