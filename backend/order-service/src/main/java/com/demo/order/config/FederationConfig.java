package com.demo.order.config;

import org.springframework.boot.autoconfigure.graphql.GraphQlSourceBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.graphql.data.federation.FederationSchemaFactory;

/**
 * Turns this service's plain Spring GraphQL schema into a real Apollo
 * Federation SUBGRAPH — same mechanism as product-service's identically-
 * named class; see that file's javadoc for the full explanation of why
 * this uses Spring GraphQL's own built-in FederationSchemaFactory
 * instead of hand-rolled reflection-based dispatch.
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
