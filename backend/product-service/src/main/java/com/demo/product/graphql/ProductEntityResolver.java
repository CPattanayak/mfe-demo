package com.demo.product.graphql;

import com.demo.product.domain.Product;
import com.demo.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.federation.EntityMapping;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * Federation entity resolver for Product — declared exactly like every
 * other GraphQL resolver in this project (a plain @Controller with an
 * annotated method), using Spring GraphQL's OWN real @EntityMapping
 * annotation — confirmed via Spring's javadoc to live in
 * org.springframework.graphql.data.federation (a dedicated federation
 * package), NOT org.springframework.graphql.data.method.annotation
 * where @QueryMapping/@SchemaMapping/@BatchMapping live; @Argument is
 * still the normal one, shared across both.
 * The federation gateway's _entities(representations) query dispatches
 * here whenever a representation's __typename is "Product" — this is
 * part of the Apollo Federation SPEC itself (any compliant gateway
 * calls it the same way; currently Hive Gateway in this project, not
 * Apollo Router — see infra/hive-gateway/), and Spring GraphQL
 * does all of the scanning/dispatch itself; nothing custom needed (see
 * FederationConfig.java for why an earlier version of this file
 * hand-rolled that unnecessarily).
 *
 * @Argument binds "id" straight out of the entity representation map
 * (e.g. {"__typename": "Product", "id": "abc-123"}), same as it would
 * bind a normal query argument.
 *
 * Plain repository access — no caching code here. See
 * ProductGraphQLController's javadoc for where caching now lives
 * (the Hive Gateway layer, not this service).
 */
@Controller
@RequiredArgsConstructor
public class ProductEntityResolver {

    private final ProductRepository productRepository;

    @EntityMapping
    public Mono<Product> product(@Argument String id) {
        return productRepository.findById(UUID.fromString(id));
    }
}
