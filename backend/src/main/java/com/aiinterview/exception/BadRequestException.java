package com.aiinterview.exception;

/**
 * The request cannot be carried out as asked (400). The message is
 * shown to the user, so it says what to do differently.
 */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
