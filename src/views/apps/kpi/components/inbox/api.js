import { apiKey, EOR_SYSTEM_PROMPT, STRATEGIC_ANALYSIS_PROMPT } from "./constants";

export async function generateGeminiContent(userPrompt) {
    const fullPrompt = `${EOR_SYSTEM_PROMPT}\n\nDEMANDE UTILISATEUR : ${userPrompt}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
            }
        );
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        return (
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Désolé, je n'ai pas pu générer de réponse."
        );
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Une erreur est survenue lors de la communication avec l'IA.";
    }
}

export async function generateStrategicAnalysis(diagnosticData) {
    const dataJson = JSON.stringify(diagnosticData, null, 2);
    const fullPrompt = `${STRATEGIC_ANALYSIS_PROMPT}\n\nDONNÉES DU PROSPECT :\n${dataJson}\n\nGénère le JSON d'analyse stratégique :`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
            }
        );

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Clean up the response and parse JSON
        const cleanedJson = textResult
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

        return JSON.parse(cleanedJson);
    } catch (error) {
        console.error("Strategic Analysis Error:", error);
        return null;
    }
}
