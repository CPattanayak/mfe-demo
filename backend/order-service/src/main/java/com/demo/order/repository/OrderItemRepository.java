package com.demo.order.repository;

import com.demo.order.domain.OrderItem;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

import java.util.Collection;
import java.util.UUID;

@Repository
public interface OrderItemRepository extends ReactiveCrudRepository<OrderItem, UUID> {
    Flux<OrderItem> findByOrderId(UUID orderId);

    /** Batched lookup — used by the OrderResolver when hydrating many orders' items at once. */
    Flux<OrderItem> findByOrderIdIn(Collection<UUID> orderIds);
}
