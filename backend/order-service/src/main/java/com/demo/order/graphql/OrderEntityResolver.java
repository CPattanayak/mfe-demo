package com.demo.order.graphql;

import com.demo.order.domain.Order;
import com.demo.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.federation.EntityMapping;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * Federation entity resolver for Order — same pattern as
 * ProductEntityResolver in product-service, using Spring GraphQL's own
 * built-in @EntityMapping annotation.
 */
@Controller
@RequiredArgsConstructor
public class OrderEntityResolver {

    private final OrderRepository orderRepository;

    @EntityMapping
    public Mono<Order> order(@Argument String id) {
        return orderRepository.findById(UUID.fromString(id));
    }
}
