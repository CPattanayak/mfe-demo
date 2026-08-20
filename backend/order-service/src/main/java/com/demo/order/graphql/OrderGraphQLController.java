package com.demo.order.graphql;

import com.demo.order.domain.Order;
import com.demo.order.domain.OrderItem;
import com.demo.order.repository.OrderItemRepository;
import com.demo.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class OrderGraphQLController {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;

    // Fix for "pagination shifts rows between pages": a Sort is always
    // applied (never unsorted), so Postgres returns rows in a consistent
    // order across separate paginated queries. `id` is always the final
    // tiebreaker (appended below) in case the user-chosen sort field has
    // duplicate values across rows (e.g. two orders with the same status).
    private static final java.util.Map<String, String> SORT_FIELD_TO_COLUMN = java.util.Map.of(
            "CREATED_AT", "createdAt",
            "UPDATED_AT", "updatedAt",
            "STATUS", "status",
            "CUSTOMER_ID", "customerId");

    @QueryMapping
    @PreAuthorize("hasRole('order:read')")
    public Flux<Order> orders(
            @Argument int page,
            @Argument int size,
            @Argument String sortField,
            @Argument String sortDirection) {
        Sort sort = resolveSort(sortField, sortDirection);
        return orderRepository.findAllBy(PageRequest.of(page, size, sort));
    }

    private Sort resolveSort(String sortField, String sortDirection) {
        String column = SORT_FIELD_TO_COLUMN.getOrDefault(sortField, "createdAt");
        Sort.Direction direction = "ASC".equalsIgnoreCase(sortDirection) ? Sort.Direction.ASC : Sort.Direction.DESC;
        // Always append `id` last: guarantees a fully deterministic order
        // even when the chosen sort field has ties, which is what actually
        // keeps pagination stable page-to-page.
        return Sort.by(new Sort.Order(direction, column), Sort.Order.asc("id"));
    }

    @QueryMapping
    @PreAuthorize("hasRole('order:read')")
    public Mono<Order> order(@Argument String id) {
        return orderRepository.findById(UUID.fromString(id));
    }

    /**
     * Fix for "OrderList always loads the entire order, even though a
     * DataLoader is involved": DataLoader batches the NETWORK CALLS to
     * product-service into one per query — it does nothing about payload
     * size or how often that payload gets re-fetched. Polling every 15s
     * (see OrderList.jsx) while eagerly requesting every item's full
     * nested Product breakdown for every order on the page was real,
     * repeated, mostly-wasted work, since the list view only actually
     * displays the product NAME.
     *
     * This single-item lookup lets the frontend request a lightweight
     * item shape (id, quantity, product { name }) for the list/poll path,
     * and defer fetching the full detail (sku, price, currency, ...) to
     * the moment a specific item is actually clicked open — see
     * OrderItemDetailsDialog.jsx. Still benefits from the same
     * @BatchMapping DataLoader for its `product` field; a single-item
     * query just means that batch happens to contain one id.
     */
    @QueryMapping
    @PreAuthorize("hasRole('order:read')")
    public Mono<OrderItem> orderItem(@Argument String id) {
        return orderItemRepository.findById(UUID.fromString(id));
    }

    /** Field resolver: Order.items — also batched automatically per top-level query. */
    @SchemaMapping(typeName = "Order", field = "items")
    public Flux<OrderItem> items(Order order) {
        return orderItemRepository.findByOrderId(order.getId());
    }

    @MutationMapping
    @PreAuthorize("hasRole('order:write')")
    public Mono<Order> createOrder(@Argument CreateOrderInput input) {
        Order order = Order.builder()
                .customerId(input.customerId())
                .status("PENDING")
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        return orderRepository.save(order)
                .flatMap(saved -> Flux.fromIterable(input.items())
                        .map(itemInput -> OrderItem.builder()
                                .orderId(saved.getId())
                                .productId(UUID.fromString(itemInput.productId()))
                                .quantity(itemInput.quantity())
                                // In a real system: price would be resolved from product-service,
                                // not trusted from client input.
                                .unitPriceCents(0L)
                                .build())
                        .flatMap(orderItemRepository::save)
                        .then(Mono.just(saved)));
    }

    @MutationMapping
    @PreAuthorize("hasRole('order:write')")
    public Mono<Order> updateOrderStatus(@Argument String id, @Argument String status) {
        return orderRepository.findById(UUID.fromString(id))
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Order not found: " + id)))
                .map(order -> {
                    order.setStatus(status);
                    order.setUpdatedAt(OffsetDateTime.now());
                    return order;
                })
                .flatMap(orderRepository::save);
    }

    public record CreateOrderItemInput(String productId, Integer quantity) {}

    public record CreateOrderInput(String customerId, List<CreateOrderItemInput> items) {}
}
