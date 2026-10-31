package com.aiinterview.entity;

import java.util.Set;

/**
 * The recruiter's final answer on a candidate, after the interview
 * (V12).
 *
 * <p>Deliberately separate from {@link ApplicationStatus}. An
 * application that reached INTERVIEWED stays INTERVIEWED: that is where
 * the candidate got to in the process. Whether they were then hired is
 * a different question, asked once, and answered by a person.
 *
 * <p>Nothing derives this from an interview score. A high mark does not
 * select anybody and a low one does not reject them; the recruiter
 * chooses, and the system only records what they chose.
 *
 * <p>Persisted as its name, matching the CHECK constraint on
 * {@code hiring_decisions.decision} (V12).
 */
public enum HiringDecisionValue {

    /**
     * No answer yet. A draft can sit here while the recruiter writes
     * notes, and it is what every application starts as.
     */
    PENDING("Awaiting recruiter decision"),

    SELECTED("Selected"),

    NOT_SELECTED("Not selected");

    private final String label;

    HiringDecisionValue(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    /**
     * The values a recruiter may actually publish. PENDING is not one:
     * publishing "we have not decided" would notify a candidate about
     * nothing.
     */
    public static final Set<HiringDecisionValue> PUBLISHABLE =
            Set.of(SELECTED, NOT_SELECTED);

    public boolean isPublishable() {
        return PUBLISHABLE.contains(this);
    }
}
