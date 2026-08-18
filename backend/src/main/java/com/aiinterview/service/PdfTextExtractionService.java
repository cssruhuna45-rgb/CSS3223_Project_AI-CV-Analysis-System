package com.aiinterview.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;

@Service
public class PdfTextExtractionService {

    public String extractText(String filePath) {
        File file = new File(filePath);

        if (!file.exists()) {
            throw new RuntimeException("PDF file not found: " + filePath);
        }

        try (PDDocument document = Loader.loadPDF(file)) {

            PDFTextStripper stripper = new PDFTextStripper();

            String text = stripper.getText(document);

            if (text == null || text.isBlank()) {
                throw new RuntimeException("No text could be extracted from PDF.");
            }

            return text.trim();

        } catch (IOException e) {
            throw new RuntimeException("Failed to extract text from PDF: " + e.getMessage(), e);
        }
    }
}