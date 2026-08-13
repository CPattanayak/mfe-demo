package com.demo.order.dataloader;

import com.demo.order.client.ProductClient;
import com.demo.order.domain.OrderItem;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Requirement #8: N+1 fix.
 *
 * Without this, resolving `product` on every OrderItem in an `orders { items
 * { product { name } } } ` query would fire one HTTP/GraphQL call to
 * product-service PER item (classic N+1). Spring GraphQL's DataLoader
 * machinery collects all the OrderItems requested during a single execution
 * and calls this @BatchMapping method exactly ONCE with the full list, which
 * in turn issues a single `productsByIds` batch query to product-service.
 */
@Controller
@RequiredArgsConstructor
public class ProductBatchLoader {

    private final ProductClient productClient;

    @BatchMapping(typeName = "OrderItem", field = "product")
    public Mono<Map<OrderItem, Object>> product(List<OrderItem> orderItems) {
        List<String> ids = orderItems.stream()
                .map(item -> item.getProductId().toString())
                .distinct()
                .toList();

        return currentBearerToken()
                .flatMap(token -> productClient.fetchProductsByIds(ids, token))
                .map(products -> {
                    Map<String, Map<String, Object>> byId = new LinkedHashMap<>();
                    for (Map<String, Object> p : products) {
                        byId.put(String.valueOf(p.get("id")), p);
                    }
                    Map<OrderItem, Object> result = new LinkedHashMap<>();
                    for (OrderItem item : orderItems) {
                        result.put(item, byId.get(item.getProductId().toString()));
                    }
                    return result;
                });
    }

    private Mono<String> currentBearerToken() {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .map(auth -> ((Jwt) auth.getPrincipal()).getTokenValue());
    }
}
