/**
 * Kafka Mutation Notifier
 *
 * On every successful GraphQL mutation, publishes ONLY the
 * user's GraphQL variables/payload to Kafka.
 *
 * Kafka is an optional 3rd-party integration.
 * Kafka failures must NEVER affect the GraphQL mutation response.
 */

import { Kafka } from "kafkajs";
import type { GatewayPlugin } from "@graphql-hive/gateway";

const NOTIFIER_ENABLED =
    (process.env.KAFKA_MUTATION_NOTIFIER_ENABLED ?? "true") !== "false";

const KAFKA_BROKERS = (
    process.env.KAFKA_BROKERS ?? "kafka:9092"
)
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);

const KAFKA_TOPIC =
    process.env.KAFKA_MUTATION_TOPIC ?? "graphql-mutations";

const kafka = new Kafka({
  clientId: "hive-gateway-mutation-notifier",
  brokers: KAFKA_BROKERS,
});

const producer = kafka.producer();

/**
 * Keep a single connection promise.
 *
 * This prevents multiple concurrent mutations from calling
 * producer.connect() at the same time.
 */
let producerConnection: Promise<void> | undefined;

function ensureProducerConnected(): Promise<void> {
  if (!producerConnection) {
    producerConnection = producer.connect().catch((error) => {
      // Allow another connection attempt if this one fails.
      producerConnection = undefined;
      throw error;
    });
  }

  return producerConnection;
}

/**
 * Fire-and-forget Kafka publishing.
 *
 * IMPORTANT:
 * This function handles ALL errors internally.
 * Nothing is thrown back to GraphQL execution.
 */
async function publishToKafka(
    payload: Record<string, unknown>,
    mutationName: string,
    operationName: string
): Promise<void> {
  try {
    await ensureProducerConnected();

    await producer.send({
      topic: KAFKA_TOPIC,

      messages: [
        {
          headers: {
            "mutation-name": mutationName,
            "operation-name": operationName,
          },

          /**
           * Only the user's GraphQL variables/payload.
           */
          value: JSON.stringify(payload),
        },
      ],
    });

    console.log(
        `[kafka-mutation-notifier] Kafka message published successfully: ${mutationName}`
    );
  } catch (error) {
    /**
     * Kafka is an optional 3rd-party integration.
     *
     * Never propagate this error back to GraphQL.
     */
    console.error(
        `[kafka-mutation-notifier] Kafka publish failed for mutation "${mutationName}":`,
        error
    );
  }
}

/**
 * Hive Gateway custom plugin.
 */
export function useKafkaMutationNotifier(): GatewayPlugin {
  return {
    onExecute({ args }) {
      /**
       * Find the GraphQL operation definition.
       */
      const operationDef = args.document.definitions.find(
          (definition) =>
              definition.kind === "OperationDefinition"
      );

      if (
          !operationDef ||
          operationDef.kind !== "OperationDefinition"
      ) {
        console.log(
            "[kafka-mutation-notifier] No operation definition found"
        );

        return;
      }

      /**
       * Ignore queries and subscriptions.
       */
      if (operationDef.operation !== "mutation") {
        return;
      }

      /**
       * GraphQL operation name.
       */
      const operationName =
          operationDef.name?.value ?? "anonymous";

      /**
       * Find the actual mutation field.
       *
       * Example:
       *
       * mutation CreateInventory {
       *   createInventory(...) {
       *     ...
       *   }
       * }
       *
       * operationName = CreateInventory
       * mutationName = createInventory
       */
      const mutationField =
          operationDef.selectionSet.selections.find(
              (selection) => selection.kind === "Field"
          );

      const mutationName =
          mutationField?.kind === "Field"
              ? mutationField.name.value
              : operationName;

      console.log(
          `[kafka-mutation-notifier] Mutation detected: ${mutationName}`
      );

      console.log(
          `[kafka-mutation-notifier] Operation: ${operationName}`
      );

      /**
       * Capture the user's GraphQL variables.
       */
      const userPayload = args.variableValues ?? {};

      console.log(
          "[kafka-mutation-notifier] User payload:",
          userPayload
      );

      /**
       * Wait for GraphQL execution to complete.
       */
      return {
        onExecuteDone({ result }) {
          /**
           * Don't publish failed mutations.
           */
          if (result?.errors?.length) {
            console.log(
                `[kafka-mutation-notifier] Mutation failed: ${mutationName}`
            );

            return;
          }

          console.log(
              `[kafka-mutation-notifier] Successful mutation: ${mutationName}`
          );

          /**
           * Kafka integration disabled.
           */
          if (!NOTIFIER_ENABLED) {
            console.log(
                "[kafka-mutation-notifier] Kafka notifier disabled"
            );

            return;
          }

          /**
           * FIRE AND FORGET
           *
           * Do NOT await this promise.
           *
           * GraphQL execution does not wait for Kafka.
           */
          void publishToKafka(
              userPayload,
              mutationName,
              operationName
          );
        },
      };
    },
  };
}