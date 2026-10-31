package com.aiinterview.service.impl;

import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.JobQuestion;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * What a job's question set must satisfy before it can be approved, and
 * how required skills are normalised.
 *
 * <p>The AI service applies the same rules to its draft
 * (ai-service/app/assessment/validation.py) so a recruiter is told about
 * problems as soon as questions are generated. This copy is the one
 * that counts, because the recruiter can edit everything in between and
 * approval happens here. Keep the two in step.
 */
public final class JobAssessmentRules {

    public static final int MIN_QUESTION_LENGTH = 20;

    public static final int MAX_QUESTION_LENGTH = 600;

    public static final int MIN_KEY_POINTS = 2;

    public static final int MAX_KEY_POINTS = 6;

    public static final int MAX_KEY_POINT_LENGTH = 300;

    public static final int MAX_TOPIC_LENGTH = 120;

    public static final int MAX_SKILLS = 30;

    public static final int MAX_SKILL_LENGTH = 100;

    /** No difficulty may make up more than this share of a set. */
    public static final double MAX_DIFFICULTY_SHARE = 0.6;

    /** Word overlap at which two questions count as the same one. */
    private static final double DUPLICATE_OVERLAP = 0.65;

    private JobAssessmentRules() {
    }

    // ========================================================
    // Required skills
    // ========================================================

    /**
     * Trimmed, inner whitespace collapsed, lower case, blanks and
     * repeats dropped, recruiter's order kept. Lower case so that
     * "Java" and "java " are one skill when Person 2's matching compares
     * them with a CV.
     */
    public static List<String> normalizeSkills(List<String> raw) {

        Set<String> skills = new LinkedHashSet<>();

        for (String skill : raw == null ? List.<String>of() : raw) {

            if (skill == null) {
                continue;
            }

            String value = skill.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);

            if (!value.isEmpty()) {
                skills.add(value);
            }
        }

        return new ArrayList<>(skills);
    }

    public static boolean isValidQuestionCount(int count) {
        return count >= JobPosting.MIN_QUESTION_COUNT && count <= JobPosting.MAX_QUESTION_COUNT;
    }

    // ========================================================
    // One question
    // ========================================================

    public static List<String> questionIssues(JobQuestion question, int number) {

        List<String> issues = new ArrayList<>();
        String label = "Question " + number;
        String text = question.getQuestionText() == null ? "" : question.getQuestionText().trim();

        if (text.length() < MIN_QUESTION_LENGTH) {
            issues.add(label + " is shorter than " + MIN_QUESTION_LENGTH + " characters.");
        }

        if (text.length() > MAX_QUESTION_LENGTH) {
            issues.add(label + " is longer than " + MAX_QUESTION_LENGTH + " characters.");
        }

        if (!JobQuestion.DIFFICULTIES.contains(question.getDifficulty())) {
            issues.add(label + " needs a difficulty of easy, medium or hard.");
        }

        List<String> points = question.getKeyPoints() == null ? List.of() : question.getKeyPoints();

        if (points.size() < MIN_KEY_POINTS) {
            issues.add(label + " needs at least " + MIN_KEY_POINTS + " key points to grade against.");
        }

        if (points.size() > MAX_KEY_POINTS) {
            issues.add(label + " has more than " + MAX_KEY_POINTS + " key points.");
        }

        return issues;
    }

    // ========================================================
    // Whole set
    // ========================================================

    /**
     * Everything that stops the set being approved, in the order a
     * recruiter would fix it. Empty means it can be approved.
     */
    public static List<String> setIssues(List<JobQuestion> questions, int expectedCount) {

        List<String> issues = new ArrayList<>();

        if (questions.size() != expectedCount) {
            issues.add("Expected " + expectedCount + " questions, found " + questions.size() + ".");
        }

        for (int i = 0; i < questions.size(); i++) {
            issues.addAll(questionIssues(questions.get(i), i + 1));
        }

        List<String> seen = new ArrayList<>();

        for (int i = 0; i < questions.size(); i++) {

            String text = questions.get(i).getQuestionText();

            if (text != null && !text.isBlank() && isDuplicate(text, seen)) {
                issues.add("Question " + (i + 1) + " repeats or closely matches another question.");
            }

            seen.add(text);
        }

        issues.addAll(difficultyMixIssues(questions));

        return issues;
    }

    static List<String> difficultyMixIssues(List<JobQuestion> questions) {

        if (questions.size() < JobPosting.MIN_QUESTION_COUNT) {
            return List.of();
        }

        Map<String, Integer> counts = new HashMap<>();

        for (JobQuestion q : questions) {
            if (JobQuestion.DIFFICULTIES.contains(q.getDifficulty())) {
                counts.merge(q.getDifficulty(), 1, Integer::sum);
            }
        }

        List<String> issues = new ArrayList<>();

        if (counts.size() < 2) {
            issues.add("Use at least two difficulty levels.");
        }

        int limit = maxPerDifficulty(questions.size());

        for (String difficulty : List.of("easy", "medium", "hard")) {

            int count = counts.getOrDefault(difficulty, 0);

            if (count > limit) {
                issues.add("Too many " + difficulty + " questions: at most " + limit
                        + " of " + questions.size() + " may share one difficulty.");
            }
        }

        return issues;
    }

    public static int maxPerDifficulty(int total) {
        return Math.max(1, (int) Math.floor(total * MAX_DIFFICULTY_SHARE));
    }

    // ========================================================
    // Duplicates (same test as is_duplicate_or_similar_question)
    // ========================================================

    static boolean isDuplicate(String question, List<String> others) {

        String normalized = normalizeText(question);
        Set<String> words = words(normalized);

        for (String other : others) {

            if (other == null || other.isBlank()) {
                continue;
            }

            String otherNormalized = normalizeText(other);

            if (normalized.equals(otherNormalized)) {
                return true;
            }

            Set<String> otherWords = words(otherNormalized);

            if (words.isEmpty() || otherWords.isEmpty()) {
                continue;
            }

            Set<String> intersection = new HashSet<>(words);
            intersection.retainAll(otherWords);

            Set<String> union = new HashSet<>(words);
            union.addAll(otherWords);

            if ((double) intersection.size() / union.size() >= DUPLICATE_OVERLAP) {
                return true;
            }
        }

        return false;
    }

    private static String normalizeText(String text) {
        return text.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static Set<String> words(String normalized) {
        return normalized.isEmpty()
                ? Set.of()
                : new HashSet<>(Arrays.asList(normalized.split(" ")));
    }
}
