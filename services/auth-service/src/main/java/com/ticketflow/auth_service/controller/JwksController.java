package com.ticketflow.auth_service.controller;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class JwksController {

    private final RSAKey rsaKey;

    public JwksController(RSAKey rsaKey) {
        this.rsaKey = rsaKey;
    }

    // Public key only. The gateway and other services use this to verify tokens.
    @GetMapping("/.well-known/jwks.json")
    public Map<String, Object> keys() {
        return new JWKSet(rsaKey.toPublicJWK()).toJSONObject();
    }
}