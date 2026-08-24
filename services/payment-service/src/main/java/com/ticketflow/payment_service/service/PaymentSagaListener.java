package com.ticketflow.payment_service.service;

import com.ticketflow.payment_service.config.RabbitMqConfig;
import com.ticketflow.payment_service.dto.SagaBookingEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class PaymentSagaListener {

    private static final Logger log = LoggerFactory.getLogger(PaymentSagaListener.class);

    private final PaymentService paymentService;

    public PaymentSagaListener(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @RabbitListener(queues = RabbitMqConfig.BOOKING_CREATED_QUEUE)
    public void onBookingCreated(SagaBookingEvent event) {
        log.info("Consumed BookingCreated event from RabbitMQ: ref={}, key={}",
                event.bookingReference(), event.idempotencyKey());
        paymentService.recordSagaBookingPayment(event);
    }
}
