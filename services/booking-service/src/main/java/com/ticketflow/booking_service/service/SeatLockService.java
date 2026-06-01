package com.ticketflow.booking_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class SeatLockService {

    private final StringRedisTemplate redisTemplate;
    private final long holdTtlSeconds;

    public SeatLockService(
            StringRedisTemplate redisTemplate,
            @Value("${booking.hold-ttl-seconds:600}") long holdTtlSeconds) {
        this.redisTemplate = redisTemplate;
        this.holdTtlSeconds = holdTtlSeconds;
    }

    public long getHoldTtlSeconds() {
        return holdTtlSeconds;
    }

    public String buildSeatKey(UUID eventId, String seatLabel) {
        return "seat:lock:" + eventId + ":" + seatLabel;
    }

    public void acquireHoldLocks(UUID eventId, List<String> seatLabels, String holdId, UUID userId) {
        List<String> newlyLockedKeys = new ArrayList<>();
        String lockValue = holdId + ":" + userId;
        Duration ttl = Duration.ofSeconds(holdTtlSeconds);

        for (String label : seatLabels) {
            String key = buildSeatKey(eventId, label);
            Boolean acquired = redisTemplate.opsForValue().setIfAbsent(key, lockValue, ttl);
            if (Boolean.TRUE.equals(acquired)) {
                newlyLockedKeys.add(key);
            } else {
                String existing = redisTemplate.opsForValue().get(key);
                if (existing != null && existing.endsWith(":" + userId)) {
                    redisTemplate.opsForValue().set(key, lockValue, ttl);
                } else {
                    if (!newlyLockedKeys.isEmpty()) {
                        redisTemplate.delete(newlyLockedKeys);
                    }
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "Seat " + label + " is currently held by another attendee");
                }
            }
        }
    }

    public void releaseHoldLocks(UUID eventId, List<String> seatLabels) {
        if (seatLabels == null || seatLabels.isEmpty()) {
            return;
        }
        List<String> keys = seatLabels.stream()
                .map(label -> buildSeatKey(eventId, label))
                .toList();
        redisTemplate.delete(keys);
    }

    public List<String> getHeldSeatLabels(UUID eventId) {
        String prefix = "seat:lock:" + eventId + ":";
        Set<String> keys = redisTemplate.keys(prefix + "*");
        if (keys == null || keys.isEmpty()) {
            return Collections.emptyList();
        }
        return keys.stream()
                .map(k -> k.substring(prefix.length()))
                .sorted()
                .toList();
    }
}
