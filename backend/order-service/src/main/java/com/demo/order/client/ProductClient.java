package com.demo.order.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Talks to product-service's GraphQL endpoint using the SAME bearer token
 * the browser sent to order-service (token forwarding), so downstream
 * permission checks (product:read) still apply to the original caller,
 * not to a service account with broader access.
 */
@Component
public class ProductClient {

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String BATCH_QUERY = """
            query ProductsByIds($ids: [ID!]!) {
              productsByIds(ids: $ids) {
                id sku name priceCents currency
              }
            }
            """;

    public ProductClient(WebClient.Builder webClientBuilder,
                          @Value("${product-service.graphql-url}") String graphqlUrl) {
        this.webClient = webClientBuilder.baseUrl(graphqlUrl).build();
    }

    /** One network call for the whole batch of ids — this is the N+1 fix. */
    public Mono<List<Map<String, Object>>> fetchProductsByIds(List<String> ids, String bearerToken) {
        Map<String, Object> body = Map.of(
                "query", BATCH_QUERY,
                "variables", Map.of("ids", ids)
        );

        return webClient.post()
                .headers(h -> h.setBearerAuth(bearerToken))
                .bodyValue(body)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(this::extractProducts);
    }

    private List<Map<String, Object>> extractProducts(JsonNode response) {
        List<Map<String, Object>> result = new ArrayList<>();
        JsonNode products = response.path("data").path("productsByIds");
        if (products.isArray()) {
            products.forEach(node -> result.add(objectMapper.convertValue(node, Map.class)));
        }
        return result;
    }
}
