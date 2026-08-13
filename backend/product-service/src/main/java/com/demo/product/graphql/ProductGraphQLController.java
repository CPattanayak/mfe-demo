package com.demo.product.graphql;

import com.demo.product.domain.Product;
import com.demo.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Requirement #9: GraphQL-level permissions.
 * Each resolver is guarded with @PreAuthorize against the Keycloak realm
 * roles carried in the access token (see SecurityConfig). A caller without
 * the role gets a clean GraphQL error instead of leaking data.
 */
@Controller
@RequiredArgsConstructor
public class ProductGraphQLController {

    private final ProductRepository productRepository;

    // Fix for "pagination shifts rows between pages": PageRequest.of(page,
    // size) with NO Sort doesn't guarantee Postgres returns rows in the
    // same order across separate queries — especially once concurrent
    // writes are happening. `id` is a tiebreaker for the (unlikely but
    // possible) case of two rows sharing the exact same createdAt.
    private static final Sort STABLE_ORDER = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"));

    @QueryMapping
    @PreAuthorize("hasRole('product:read')")
    public Flux<Product> products(@Argument int page, @Argument int size) {
        return productRepository.findAllBy(PageRequest.of(page, size, STABLE_ORDER));
    }

    @QueryMapping
    @PreAuthorize("hasRole('product:read')")
    public Mono<Product> product(@Argument String id) {
        return productRepository.findById(UUID.fromString(id));
    }

    /** Internal batch endpoint consumed by order-service's DataLoader (requirement #8). */
    @QueryMapping
    @PreAuthorize("hasRole('product:read')")
    public Flux<Product> productsByIds(@Argument List<String> ids) {
        List<UUID> uuids = ids.stream().map(UUID::fromString).toList();
        return productRepository.findAllByIdIn(uuids);
    }

    @MutationMapping
    @PreAuthorize("hasRole('product:write')")
    public Mono<Product> createProduct(@Argument CreateProductInput input,
                                        @AuthenticationPrincipal Jwt jwt) {
        Product product = Product.builder()
                .sku(input.sku())
                .name(input.name())
                .description(input.description())
                .priceCents(input.priceCents())
                .currency(input.currency() == null ? "USD" : input.currency())
                .createdBy(jwt.getClaimAsString("preferred_username"))
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
        return productRepository.save(product);
    }

    @MutationMapping
    @PreAuthorize("hasRole('product:write')")
    public Mono<Product> updateProduct(@Argument String id, @Argument UpdateProductInput input) {
        return productRepository.findById(UUID.fromString(id))
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Product not found: " + id)))
                .map(existing -> {
                    if (input.name() != null) existing.setName(input.name());
                    if (input.description() != null) existing.setDescription(input.description());
                    if (input.priceCents() != null) existing.setPriceCents(input.priceCents());
                    existing.setUpdatedAt(OffsetDateTime.now());
                    return existing;
                })
                .flatMap(productRepository::save);
    }

    @MutationMapping
    @PreAuthorize("hasRole('admin')")
    public Mono<Boolean> deleteProduct(@Argument String id) {
        UUID uuid = UUID.fromString(id);
        return productRepository.existsById(uuid)
                .flatMap(exists -> exists
                        ? productRepository.deleteById(uuid).thenReturn(true)
                        : Mono.just(false));
    }

    public record CreateProductInput(String sku, String name, String description,
                                      Long priceCents, String currency) {}

    public record UpdateProductInput(String name, String description, Long priceCents) {}
}
