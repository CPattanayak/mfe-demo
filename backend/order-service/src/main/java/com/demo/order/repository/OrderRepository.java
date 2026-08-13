package com.demo.order.repository;

import com.demo.order.domain.Order;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

import java.util.UUID;

@Repository
public interface OrderRepository extends ReactiveCrudRepository<Order, UUID> {
    Flux<Order> findAllBy(Pageable pageable);
}
