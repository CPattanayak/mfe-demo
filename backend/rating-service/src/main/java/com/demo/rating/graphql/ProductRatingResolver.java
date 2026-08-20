package com.demo.rating.graphql;

import com.demo.rating.domain.ProductRating;
import com.demo.rating.repository.ProductRatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.federation.EntityMapping;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Same "extend an entity you don't own" pattern as inventory-service's
 * ProductInventoryResolver — see that class's javadoc for the shared
 * mechanics (batched EntityMapping reference resolver, Fetch-then-
 * Flatten execution shape, why the wrapper record MUST be named exactly
 * "Product"). The thing actually worth reading THIS class for is the
 * contrast in the rating() method below.
 *
 * Compare the two BatchMapping return shapes directly:
 *
 *   inventory-service: Mono&lt;Map&lt;Product, List&lt;Inventory&gt;&gt;&gt;   one product -&gt; MANY rows
 *   rating-service:     Mono&lt;Map&lt;Product, ProductRating&gt;&gt;         one product -&gt; AT MOST ONE row
 *
 * Both still batch the SAME way — one "WHERE product_id IN (...)" query
 * for the whole batch, not one query per product — batching and
 * cardinality (1:1 vs 1:many) are independent concerns. A product with
 * NO rating yet simply has no entry in the grouped map, so
 * grouped.get(id) returns null — and null is a perfectly valid value for
 * the schema's nullable Product.rating field, unlike inventory's
 * non-null [Inventory!]! list (which needed an explicit empty-list
 * fallback instead).
 *
 * Plain repository access, ONE bulk query for the whole batch — no
 * caching code here at all. Response caching moved to the GATEWAY layer
 * (see infra/hive-gateway/gateway.config.ts), which caches the whole
 * GraphQL response per-type rather than individual method calls — so,
 * unlike the earlier Spring-side @Cacheable approach, this resolver
 * doesn't need restructuring into per-id lookups to benefit from
 * caching; the efficient single-bulk-query DataLoader shape and the
 * gateway's response caching are independent, complementary layers.
 */
@Controller
@RequiredArgsConstructor
public class ProductRatingResolver {

    private final ProductRatingRepository productRatingRepository;

    @EntityMapping
    public Flux<Product> product(@Argument List<String> idList) {
        return Flux.fromIterable(idList).map(Product::new);
    }

    @BatchMapping(typeName = "Product", field = "rating")
    public Mono<Map<Product, ProductRating>> rating(List<Product> products) {
        List<UUID> productIds = products.stream()
                .map(p -> UUID.fromString(p.id()))
                .distinct()
                .toList();

        return productRatingRepository.findAllByProductIdIn(productIds)
                .collectMap(r -> r.getProductId().toString())
                .map(byProductId -> {
                    Map<Product, ProductRating> result = new HashMap<>();
                    for (Product p : products) {
                        // No .getOrDefault(..., someFallback) here — unlike
                        // inventory's empty-list fallback, a missing entry
                        // correctly stays null, matching the schema's
                        // nullable ProductRating (a brand-new product with
                        // zero reviews genuinely has no rating record).
                        result.put(p, byProductId.get(p.id()));
                    }
                    return result;
                });
    }

    /** Direct lookup, bypassing the Product entity extension. */
    @QueryMapping
    @PreAuthorize("hasRole('product:read')")
    public Mono<ProductRating> ratingForProduct(@Argument String productId) {
        return productRatingRepository.findById(UUID.fromString(productId));
    }

    /** Bare wrapper around a Product's id — MUST be named exactly "Product", see class javadoc. */
    public record Product(String id) {}
}
