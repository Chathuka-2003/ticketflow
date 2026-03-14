package com.ticketflow.api_gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

import static org.springframework.cloud.gateway.server.mvc.filter.BeforeFilterFunctions.uri;
import static org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions.route;
import static org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions.http;
import static org.springframework.web.servlet.function.RequestPredicates.path;

@Configuration
public class RouteConfig {

    @Bean
    public RouterFunction<ServerResponse> authRoute(@Value("${services.auth-url}") String authUrl) {
        return route("auth-service")
                .route(path("/api/auth/**"), http())
                .before(uri(authUrl))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> eventRoute(@Value("${services.event-url}") String eventUrl) {
        return route("event-service")
                .route(path("/api/events/**").or(path("/api/venues/**")), http())
                .before(uri(eventUrl))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> bookingRoute(@Value("${services.booking-url}") String bookingUrl) {
        return route("booking-service")
                .route(path("/api/bookings/**"), http())
                .before(uri(bookingUrl))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> paymentRoute(@Value("${services.payment-url}") String paymentUrl) {
        return route("payment-service")
                .route(path("/api/payments/**"), http())
                .before(uri(paymentUrl))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> notificationRoute(
            @Value("${services.notification-url}") String notificationUrl) {
        return route("notification-service")
                .route(path("/api/notifications/**"), http())
                .before(uri(notificationUrl))
                .build();
    }
}