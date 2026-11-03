package com.aiinterview.service.impl;

import com.aiinterview.exception.InvalidFileException;
import com.aiinterview.service.FileStorageService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;

@Service
public class FileStorageServiceImpl implements FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageServiceImpl.class);

    private final Path fileStorageLocation;

    public FileStorageServiceImpl(@Value("${file.upload-dir:uploads/resumes/}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (IOException | SecurityException ex) {
            log.error("Could not create the upload directory {}", fileStorageLocation, ex);
            throw new InvalidFileException("CV uploads are unavailable right now. Please try again later.");
        }
    }

    @Override
    public String storeFile(MultipartFile file, String storedFileName) {
        try {
            if (storedFileName.contains("..")) {
                log.warn("Refused to store a file whose name contains a path sequence");
                throw new InvalidFileException("This file name isn't allowed. Rename the file and try again.");
            }

            Path targetLocation = this.fileStorageLocation.resolve(storedFileName);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
            }
            return targetLocation.toString();
        } catch (IOException ex) {
            log.error("Could not store uploaded file {}", storedFileName, ex);
            throw new InvalidFileException("We couldn't save your CV. Please try again.");
        }
    }

    @Override
    public void deleteFile(String filePath) {
        try {
            Path path = Paths.get(filePath);
            Files.deleteIfExists(path);
        } catch (IOException ex) {
            // Log warning, swallow to allow DB transaction to complete
        }
    }
}
