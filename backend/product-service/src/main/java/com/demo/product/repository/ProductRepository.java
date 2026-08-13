package com.demo.product.repository;

import com.demo.product.domain.Product;
import org.springframework.data.domain.Pageable;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

import java.util.Collection;
import java.util.UUID;

/**
 * Reactive, non-blocking repository backed by R2DBC — used for both
 * queries (find*) and mutations (save/delete, inherited from
 * ReactiveCrudRepository) against product_schema.products.
 */
@Repository
public interface ProductRepository extends ReactiveCrudRepository<Product, UUID> {

    Flux<Product> findAllBy(Pageable pageable);

    @Query("SELECT * FROM products WHERE id = ANY(:ids)")
    Flux<Product> findAllByIdIn(Collection<UUID> ids);
}
