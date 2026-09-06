package com.aiinterview.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.DecodingException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}")
    private String secretKey;

    @Value("${jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(String email, Long userId) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("userId", userId);
        return buildToken(extraClaims, email, jwtExpirationMs);
    }

    private String buildToken(Map<String, Object> extraClaims, String subject, long expiration) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey())
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Turns the configured secret into a signing key.
     *
     * <p>The secret is accepted either as Base64 or as plain text. This
     * used to call {@code Decoders.BASE64.decode} unguarded, so any
     * secret that was not valid Base64 threw here instead of returning
     * a key - and because this runs inside the auth filter, every
     * request came back "Invalid or expired JWT token", including
     * registration. A passphrase, or anything from
     * {@code secrets.token_urlsafe} (which emits '-' and '_', outside
     * the Base64 alphabet), was enough to trigger it.
     */
    private SecretKey getSignInKey() {

        byte[] keyBytes;

        try {
            keyBytes = Decoders.BASE64.decode(secretKey);
        } catch (DecodingException e) {
            // Not Base64 - treat the secret as the raw key material.
            keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        }

        if (keyBytes.length < 32) {
            // Decoded, but too small to sign with. The plain text is
            // usually longer than its own Base64 decoding.
            keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        }

        if (keyBytes.length < 32) {
            // Fail with the actual cause. Keys.hmacShaKeyFor would also
            // reject this, but the message would not say which setting
            // is wrong.
            throw new IllegalStateException(
                    "jwt.secret is too short: HS256 needs at least 32 bytes, got "
                            + keyBytes.length
                            + ". Generate one with: python -c \"import base64, secrets;"
                            + " print(base64.b64encode(secrets.token_bytes(48)).decode())\"");
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }
}
