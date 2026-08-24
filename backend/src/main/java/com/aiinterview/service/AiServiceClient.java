package com.aiinterview.service;

import com.aiinterview.dto.ResumeAnalysisRequest;
import com.aiinterview.dto.ResumeAnalysisResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
@RequiredArgsConstructor
public class AiServiceClient {

    private final ObjectMapper objectMapper;

        private final HttpClient httpClient =
        HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();
                
    public ResumeAnalysisResponse analyzeResume(
            Long resumeId,
            String resumeText
    ) {

        ResumeAnalysisRequest request =
                ResumeAnalysisRequest.builder()
                        .resumeId(resumeId)
                        .text(resumeText)
                        .build();

        try {

            String jsonBody =
                    objectMapper.writeValueAsString(request);

            System.out.println("========== AI REQUEST ==========");
            System.out.println(
                    "URL: http://localhost:8000/api/v1/resume/analyze"
            );
            System.out.println(
                    "JSON BODY: " + jsonBody
            );
            System.out.println(
                    "BODY LENGTH: " + jsonBody.length()
            );
            System.out.println("================================");

            HttpRequest httpRequest =
                    HttpRequest.newBuilder()
                            .uri(URI.create(
                                    "http://localhost:8000/api/v1/resume/analyze"
                            ))
                            .header(
                                    "Content-Type",
                                    "application/json"
                            )
                            .header(
                                    "Accept",
                                    "application/json"
                            )
                            .POST(
                                    HttpRequest.BodyPublishers.ofString(
                                            jsonBody
                                    )
                            )
                            .build();

            HttpResponse<String> response =
                    httpClient.send(
                            httpRequest,
                            HttpResponse.BodyHandlers.ofString()
                    );

            System.out.println("========== AI RESPONSE ==========");
            System.out.println(
                    "STATUS: " + response.statusCode()
            );
            System.out.println(
                    "BODY: " + response.body()
            );
            System.out.println("=================================");

            if (response.statusCode() < 200 ||
                    response.statusCode() >= 300) {

                throw new RuntimeException(
                        "AI service returned HTTP "
                                + response.statusCode()
                                + ": "
                                + response.body()
                );
            }

            return objectMapper.readValue(
                    response.body(),
                    ResumeAnalysisResponse.class
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to call AI service: "
                            + e.getMessage(),
                    e
            );
        }
    }
}