package com.aiinterview.entity;

/**
 * Account role.
 *
 * <p>Persisted as its name, so the values must stay in sync with the
 * {@code users.role} column. The wire form used by the frontend is
 * lowercase ({@code candidate}, {@code recruiter}), which
 * {@link #fromWireValue} converts.
 */
public enum Role {

    CANDIDATE,

    RECRUITER,

    ADMIN;

    /**
     * Parses the role as sent by the client. Unknown or missing values
     * fall back to {@link #CANDIDATE}: registration should never hand
     * out a more privileged role than was asked for.
     */
    public static Role fromWireValue(String value) {

        if (value == null || value.isBlank()) {
            return CANDIDATE;
        }

        try {
            Role role = Role.valueOf(value.trim().toUpperCase());

            // ADMIN is assigned out of band, never by self-registration.
            return role == ADMIN ? CANDIDATE : role;

        } catch (IllegalArgumentException e) {
            return CANDIDATE;
        }
    }

    /**
     * The lowercase form the frontend compares against.
     */
    public String toWireValue() {
        return name().toLowerCase();
    }
}
