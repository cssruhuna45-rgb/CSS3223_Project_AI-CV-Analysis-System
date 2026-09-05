package com.aiinterview.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RoleTest {

    @Test
    @DisplayName("accepts the roles a user may pick, in any case")
    void parsesSelectableRoles() {

        assertEquals(Role.CANDIDATE, Role.fromWireValue("candidate"));
        assertEquals(Role.CANDIDATE, Role.fromWireValue("CANDIDATE"));
        assertEquals(Role.RECRUITER, Role.fromWireValue("recruiter"));
        assertEquals(Role.RECRUITER, Role.fromWireValue("  Recruiter  "));
    }

    @ParameterizedTest(name = "\"{0}\"")
    @ValueSource(strings = {"admin", "ADMIN", " Admin "})
    @DisplayName("never grants ADMIN through self-registration")
    void refusesAdmin(String requested) {

        assertEquals(Role.CANDIDATE, Role.fromWireValue(requested));
    }

    @ParameterizedTest(name = "\"{0}\"")
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "superuser", "ROLE_ADMIN", "'; DROP TABLE users;--"})
    @DisplayName("falls back to the least privileged role")
    void fallsBackToCandidate(String requested) {

        assertEquals(Role.CANDIDATE, Role.fromWireValue(requested));
    }

    @Test
    @DisplayName("wire value is the lowercase name the frontend compares against")
    void wireValueIsLowercase() {

        assertEquals("candidate", Role.CANDIDATE.toWireValue());
        assertEquals("recruiter", Role.RECRUITER.toWireValue());
        assertEquals("admin", Role.ADMIN.toWireValue());
    }
}
