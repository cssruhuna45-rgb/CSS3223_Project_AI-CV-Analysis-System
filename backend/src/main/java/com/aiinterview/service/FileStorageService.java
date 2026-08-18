package com.aiinterview.service;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {
    String storeFile(MultipartFile file, String storedFileName);
    void deleteFile(String filePath);
}
