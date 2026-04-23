package com.ticketflow.booking_service.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    public static final String SAGA_EXCHANGE = "ticketflow.events.exchange";
    public static final String BOOKING_CREATED_QUEUE = "ticketflow.booking.created.queue";
    public static final String PAYMENT_COMPLETED_QUEUE = "ticketflow.payment.completed.queue";
    public static final String PAYMENT_FAILED_QUEUE = "ticketflow.payment.failed.queue";

    public static final String ROUTING_BOOKING_CREATED = "booking.created";
    public static final String ROUTING_PAYMENT_COMPLETED = "payment.completed";
    public static final String ROUTING_PAYMENT_FAILED = "payment.failed";

    @Bean
    public TopicExchange sagaExchange() {
        return new TopicExchange(SAGA_EXCHANGE, true, false);
    }

    @Bean
    public Queue bookingCreatedQueue() {
        return new Queue(BOOKING_CREATED_QUEUE, true);
    }

    @Bean
    public Queue paymentCompletedQueue() {
        return new Queue(PAYMENT_COMPLETED_QUEUE, true);
    }

    @Bean
    public Queue paymentFailedQueue() {
        return new Queue(PAYMENT_FAILED_QUEUE, true);
    }

    @Bean
    public Binding bookingCreatedBinding(Queue bookingCreatedQueue, TopicExchange sagaExchange) {
        return BindingBuilder.bind(bookingCreatedQueue).to(sagaExchange).with(ROUTING_BOOKING_CREATED);
    }

    @Bean
    public Binding paymentCompletedBinding(Queue paymentCompletedQueue, TopicExchange sagaExchange) {
        return BindingBuilder.bind(paymentCompletedQueue).to(sagaExchange).with(ROUTING_PAYMENT_COMPLETED);
    }

    @Bean
    public Binding paymentFailedBinding(Queue paymentFailedQueue, TopicExchange sagaExchange) {
        return BindingBuilder.bind(paymentFailedQueue).to(sagaExchange).with(ROUTING_PAYMENT_FAILED);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}
