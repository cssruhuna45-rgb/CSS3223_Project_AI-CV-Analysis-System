package com.aiinterview.service;

import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;

@Service
public class PdfTextExtractionService {

    private static final String TESSERACT_DATA_PATH =
            "C:\\Program Files\\Tesseract-OCR\\tessdata";

    public String extractText(String filePath) {

        File file = new File(filePath);

        if (!file.exists()) {
            throw new RuntimeException(
                    "PDF file not found: " + filePath);
        }

        try (PDDocument document = Loader.loadPDF(file)) {

            // 1. Try normal PDF text extraction first
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);

            if (text != null && !text.isBlank()) {
                System.out.println(
                        "PDF text extracted successfully using PDFBox.");
                return text.trim();
            }

            // 2. No text found -> OCR fallback
            System.out.println(
                    "No text found using PDFBox. Starting OCR...");

            return extractTextUsingOCR(document);

        } catch (IOException e) {

            throw new RuntimeException(
                    "Failed to process PDF: "
                            + e.getMessage(), e);
        }
    }

    private String extractTextUsingOCR(PDDocument document) {

    PDFRenderer renderer = new PDFRenderer(document);

    Tesseract tesseract = new Tesseract();

    // Tesseract tessdata directory
    tesseract.setDatapath(TESSERACT_DATA_PATH);

    // English OCR
    tesseract.setLanguage("eng");

    StringBuilder extractedText = new StringBuilder();

    try {

        for (int page = 0; page < document.getNumberOfPages(); page++) {

            System.out.println(
                    "Running OCR on page " + (page + 1));

            // Render PDF page as image
            BufferedImage image =
                    renderer.renderImageWithDPI(page, 300);

            String pageText =
                    tesseract.doOCR(image);

            if (pageText != null && !pageText.isBlank()) {
                extractedText.append(pageText)
                        .append("\n");
            }
        }

    } catch (IOException | TesseractException e) {

        throw new RuntimeException(
                "OCR failed: " + e.getMessage(), e);
    }

    if (extractedText.toString().isBlank()) {

        throw new RuntimeException(
                "No text could be extracted from PDF using PDFBox or OCR.");
    }

    System.out.println(
            "OCR completed successfully. Extracted characters: "
                    + extractedText.length());

    return extractedText.toString().trim();
}
}