const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse'); // PDF support
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Gemini AI
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// =====================================================================
// ANTI-CRASH SHIELD: Backend ko band hone se bachane ke liye
// =====================================================================
process.on('uncaughtException', (err) => {
    console.error("🚨 CRITICAL: Uncaught Exception Aaya! (Backend band hone se bacha liya):", err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error("🚨 CRITICAL: Unhandled Rejection Aaya! Reason:", reason);
});

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() }); // RAM mein save karega, nodemon restart nahi hoga
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// =====================================================================
// STEP 1: Sirf Ingredients aur Percentages Extract Karna (File/Image/Text se)
// =====================================================================
app.post('/api/extract', upload.single('formulaFile'), async (req, res) => {
    try {
        console.log("Step 1: Extraction Request Aayi! Input type check kar rahe hain...");
        
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        // Extraction Prompt - Backticks removed to prevent syntax errors
        let promptText = `
        You are a highly accurate data extraction tool. 
        Carefully read the provided cosmetic formula text or image and extract ALL ingredients and their percentages.
        
        CRITICAL INSTRUCTION: Return EXACTLY a valid JSON array of objects. Do not add any markdown formatting. Just return the raw JSON array.
        
        Format each object exactly like this:
        [
          {
            "ingredient": "Name of the ingredient",
            "inputPercentage": "The percentage found (if not specified, write 'Not specified')"
          }
        ]
        `;

        let aiPromptParts = []; // Array to hold text and potentially image data

        // 1. Direct Text check
        if (req.body.rawText && req.body.rawText.trim() !== "") {
            console.log("Direct Text received.");
            aiPromptParts = [promptText + "\n\nHere is the text provided:\n" + req.body.rawText];
        } 
        // 2. File/Image check
        else if (req.file) {
            console.log("File received:", req.file.originalname, "| Mimetype:", req.file.mimetype);
            
            // Image detect (JPG/PNG)
            if (req.file.mimetype.startsWith('image/')) {
                console.log("Image detect hui! AI ko image pass kar rahe hain...");
                const imageBase64 = req.file.buffer.toString("base64");
                const imagePart = {
                    inlineData: {
                        data: imageBase64,
                        mimeType: req.file.mimetype
                    }
                };
                aiPromptParts = [promptText + "\n\nHere is the image containing the formula:", imagePart];
            } 
            // PDF detect
            else if (req.file.mimetype === 'application/pdf') {
                const dataBuffer = req.file.buffer;
                const pdfData = await pdfParse(dataBuffer);
                console.log("PDF text extracted successfully.");
                aiPromptParts = [promptText + "\n\nHere is the formula data (extracted from PDF):\n" + pdfData.text];
            } 
            // Text/CSV detect
            else {
                const fileContent = req.file.buffer.toString('utf8');
                aiPromptParts = [promptText + "\n\nHere is the formula data:\n" + fileContent];
            }
        } 
        // 3. Koi input nahi
        else {
            return res.status(400).json({ error: "Bhai kuch toh input do (File, Image ya Text)!" });
        }

        console.log("Gemini AI ko data bhej rahe hain extraction ke liye...");

        const result = await model.generateContent(aiPromptParts);
        let aiResponseText = result.response.text();
        
        // Clean JSON safely
        aiResponseText = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();

        let extractedData;
        try {
            extractedData = JSON.parse(aiResponseText);
        } catch (e) {
            console.error("AI did not return valid JSON:", aiResponseText);
            throw new Error("AI output format galat hai.");
        }

        res.json({ message: "Extraction Complete", extractedData });

    } catch (error) {
        console.error("Extraction Error:", error);
        res.status(500).json({ error: "Extraction process mein error aaya." });
    }
});

// =====================================================================
// STEP 2: Extracted Data ka COFEPRIS Compliance Check Karna
// =====================================================================
app.post('/api/evaluate', async (req, res) => {
    try {
        console.log("Step 2: Evaluation Request Aayi...");
        const ingredientsList = req.body.ingredients;

        if (!ingredientsList || ingredientsList.length === 0) {
            return res.status(400).json({ error: "Ingredients list empty hai!" });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        // Evaluation Prompt - Backticks removed to prevent syntax errors
        let promptText = `
        You are a strict, highly detailed COFEPRIS regulatory compliance expert for cosmetics in Mexico. 
        Evaluate the following extracted cosmetic ingredients and their percentages.
        
        CRITICAL INSTRUCTION: Return EXACTLY a valid JSON array of objects. Do not add any markdown formatting. Just return the raw JSON array.
        
        Format each object exactly like this:
        [
          {
            "ingredient": "Name of the ingredient",
            "inputPercentage": "The percentage found",
            "status": "Pass, Fail, or Warning",
            "remarks": "Provide a highly detailed explanation. If Pass, mention the maximum allowable COFEPRIS limit (if any) and confirm it is within safe bounds. If Fail or Warning, provide the EXACT maximum limit allowed, the specific reason it is restricted (e.g., toxicity, skin sensitization, carcinogenic properties), and mention the specific context or annex under COFEPRIS guidelines. Be thorough and professional."
          }
        ]
        
        Here are the ingredients to evaluate:
        ${JSON.stringify(ingredientsList)}
        `;

        console.log("Gemini AI ko rules check karne ke liye bhej rahe hain...");

        const result = await model.generateContent(promptText);
        let aiResponseText = result.response.text();
        
        // Clean JSON safely
        aiResponseText = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();

        let finalReport;
        try {
            finalReport = JSON.parse(aiResponseText);
        } catch (e) {
            console.error("AI did not return valid JSON for evaluation:", aiResponseText);
            throw new Error("AI evaluation output format galat hai.");
        }

        res.json({ message: "Evaluation Complete", report: finalReport });

    } catch (error) {
        console.error("Evaluation Error:", error);
        res.status(500).json({ error: "Compliance check mein error aaya." });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});