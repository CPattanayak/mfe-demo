package com.demo.inventory.config;

import org.springframework.boot.autoconfigure.graphql.GraphQlSourceBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.graphql.data.federation.FederationSchemaFactory;

/**
 * Turns this service's plain Spring GraphQL schema into a real Apollo
 * Federation SUBGRAPH — using Spring GraphQL's OWN, OFFICIAL, BUILT-IN
 * federation integration (spring-graphql's FederationSchemaFactory),
 * documented at:
 * https://docs.spring.io/spring-graphql/reference/federation.html
 *
 * This replaces an earlier, badly over-engineered version of this class
 * that hand-rolled a custom @EntityMapping annotation + reflection-based
 * bean scanning, AND got the GraphQlSourceBuilderCustomizer import wrong
 * (org.springframework.graphql.execution — doesn't exist there; it's
 * org.springframework.boot.autoconfigure.graphql, a Spring BOOT
 * autoconfigure class, not core Spring GraphQL). Spring GraphQL already
 * ships exactly this feature, including automatic BATCH loading (an
 * @EntityMapping method can accept @Argument List<...> idList and return
 * a List/Flux in the same order) — no custom code needed at all.
 *
 * Entity resolvers are now declared exactly like every other resolver in
 * this codebase — see ProductInventoryResolver, a plain @Controller with
 * an @EntityMapping method (org.springframework.graphql.data.federation —
 * a dedicated federation package, not the same one as @QueryMapping/
 * @SchemaMapping/@BatchMapping).
 */
@Configuration
public class FederationConfig {

    @Bean
    public GraphQlSourceBuilderCustomizer federationCustomizer(FederationSchemaFactory factory) {
        return builder -> builder.schemaFactory(factory::createGraphQLSchema);
    }

    @Bean
    public FederationSchemaFactory federationSchemaFactory() {
        return new FederationSchemaFactory();
    }
}
