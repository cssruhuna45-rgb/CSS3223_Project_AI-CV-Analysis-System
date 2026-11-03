package com.aiinterview.service;

import com.aiinterview.dto.PublicJobDetailDto;
import com.aiinterview.dto.PublicJobDto;

import java.util.List;

/**
 * The candidates' Public Jobs list (V13).
 *
 * <p>Only jobs that are published and not archived are ever returned.
 * A draft or archived job is "not found" here even by its id, so it
 * cannot be read by guessing ids.
 */
public interface PublicJobService {

    /** Every listed job, most recently published first; closed ones included. */
    List<PublicJobDto> listPublished();

    /** One listed job, with the signed-in candidate's own application for it. */
    PublicJobDetailDto getPublished(String candidateEmail, Long jobId);
}
