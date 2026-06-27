package com.ticketflow.notification_service.service;

import com.ticketflow.notification_service.config.RabbitMqConfig;
import com.ticketflow.notification_service.dto.SagaBookingEvent;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class NotificationSagaListener {

    private final NotificationService notificationService;

    public NotificationSagaListener(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @RabbitListener(queues = RabbitMqConfig.PAYMENT_COMPLETED_QUEUE)
    public void onPaymentCompleted(SagaBookingEvent event) {
        notificationService.handlePaymentCompleted(event);
    }

    @RabbitListener(queues = RabbitMqConfig.PAYMENT_FAILED_QUEUE)
    public void onPaymentFailed(SagaBookingEvent event) {
        notificationService.handlePaymentFailed(event);
    }
}
