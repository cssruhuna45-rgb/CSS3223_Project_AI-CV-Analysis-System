package com.aiinterview.dto;

/**
 * How the latest interview compares with the one before it.
 */
public enum ProgressTrend {

    /**
     * Nothing scored yet, so there is nothing to compare.
     */
    NO_DATA,

    /**
     * Exactly one scored interview: a baseline, not a trend.
     */
    FIRST_INTERVIEW,

    IMPROVING,

    DECREASING,

    STABLE
}
