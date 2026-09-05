package com.aiinterview.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class AiServiceConfig {

    @Bean
    public RestClient restClient(
            @Value("${ai-service.url}") String aiServiceUrl
    ) {
        return RestClient.builder()
                .baseUrl(aiServiceUrl)
                .build();
    }
}