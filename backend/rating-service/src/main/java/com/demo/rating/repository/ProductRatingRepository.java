package com.demo.rating.repository;

import com.demo.rating.domain.ProductRating;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

import java.util.Collection;
import java.util.UUID;

@Repository
public interface ProductRatingRepository extends ReactiveCrudRepository<ProductRating, UUID> {

    // productId IS the primary key here, so this is functionally the
    // same as the inherited findAllById(Iterable<UUID>) — named
    // explicitly to match the batch-resolution call site's intent
    // (ProductRatingResolver.java). Explicit "IN (:productIds)" rather
    // than relying on derived-query generation for the Collection
    // parameter — same defensive choice as product-service's
    // ProductRepository and inventory-service's InventoryRepository,
    // after the earlier "= ANY(:ids)" bug (Spring Data R2DBC's
    // Collection-parameter binding for that operator silently matched
    // nothing, with no error).
    @Query("SELECT * FROM product_rating WHERE product_id IN (:productIds)")
    Flux<ProductRating> findAllByProductIdIn(Collection<UUID> productIds);
}

