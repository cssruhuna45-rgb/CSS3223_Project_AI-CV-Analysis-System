package com.aiinterview.exception;

/**
 * The request clashes with something already stored (409) - a second
 * attempt at a job interview the candidate already finished, say.
 */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
