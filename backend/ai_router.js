const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

async function executeWithRetry(apiCall, maxRetries = 6) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await apiCall();
        } catch (error) {
            if ((error.message.includes('503') || error.message.includes('429')) && i < maxRetries - 1) {
                const waitTime = error.message.includes('429') ? 16000 : Math.pow(2, i) * 1000;
                console.log(`[API] ${error.message.includes('429') ? '429 Rate Limit' : '503 Overload'}. Retrying in ${waitTime / 1000} seconds...`);
                await new Promise(res => setTimeout(res, waitTime));
            } else {
                throw error;
            }
        }
    }
}

function fileToGenerativePart(filePath, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType
        },
    };
}

class AIRouter {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async processMessage(message, currentTopic, files = [], obsidianManager, vendedor_id = 'Unknown', sql = null) {
        try {
            if (!this.genAI.apiKey || this.genAI.apiKey === 'your_gemini_api_key_here') {
                return { response: "Error: API KEY de Gemini no configurada.", shouldCreateNode: false, nodeData: null };
            }

            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            // Procesar archivos si existen
            const imageParts = [];
            for (const file of files) {
                imageParts.push(fileToGenerativePart(file.path, file.mimetype));
            }
            
            const prompt = `You are the Virtual Corporate Brain of Atomic (a tech and sales company).
The user talking to you is a salesperson named: "${vendedor_id}".
The user is talking about: "${currentTopic}".
Message from user: "${message}"
Has attached files: ${files.length > 0 ? 'Yes' : 'No'}

Your goal is to act as their virtual assistant, help them, and PROACTIVELY ask for their daily sales reports, client updates, and metrics.
If they provide metrics or client updates, you MUST save them using "saveReport" = true.

Task: Analyze the message.
OUTPUT STRICTLY JSON WITHOUT MARKDOWN. Format:
{
  "shouldCreateNode": boolean (true if you need to save a general note to Obsidian),
  "nodeTitle": "Brief descriptive title" (if creating node),
  "nodeContent": "Structured content to save to Obsidian" (if creating node),
  "saveReport": boolean (true if the user provided sales metrics, client updates, or daily stats that should be saved to the database),
  "reportData": { "tipo": "ventas|cliente|otro", "resumen": "...", "monto": 0 } (only if saveReport is true),
  "instructionsForExecutor": "Tell the local AI what to respond to the user in Spanish.",
  "showWorkflowButtons": boolean (true if the user is in a guided workflow),
  "hideWorkflowButtons": boolean (true if the user wants to end)
}`;

            let result;
            if (imageParts.length > 0) {
                result = await executeWithRetry(() => model.generateContent([prompt, ...imageParts]));
            } else {
                result = await executeWithRetry(() => model.generateContent(prompt));
            }
            
            let responseText = result.response.text().trim();
            
            if (responseText.startsWith('\`\`\`json')) {
                responseText = responseText.slice(7, -3);
            } else if (responseText.startsWith('\`\`\`')) {
                responseText = responseText.slice(3, -3);
            }

            let parsedPlan;
            try {
                parsedPlan = JSON.parse(responseText);
                console.log("[ORCHESTRATOR PLAN]", parsedPlan);
            } catch (e) {
                console.error("[ORCHESTRATOR] JSON Parse Error. Raw:", responseText);
                parsedPlan = {
                    shouldCreateNode: false,
                    saveReport: false,
                    instructionsForExecutor: "Responde amablemente como el Cerebro Corporativo.",
                    showWorkflowButtons: false,
                    hideWorkflowButtons: false
                };
            }

            if (parsedPlan.saveReport && sql) {
                try {
                    await sql\`INSERT INTO reportes_ventas (vendedor_id, datos) VALUES (\${vendedor_id}, \${parsedPlan.reportData})\`;
                    console.log("[SUPABASE] Reporte guardado con éxito.");
                } catch (e) {
                    console.error("[SUPABASE] Error guardando reporte:", e);
                }
            }

            // FASE 2: EJECUTOR (Gemini Dual)
            let finalResponseText = "Conexión con Ejecutor fallida.";
            try {
                const executorPrompt = `You are the Virtual Corporate Brain of Atomic.
Context Topic: "${currentTopic}"
User Input: "${message}"
Directive: ${parsedPlan.instructionsForExecutor}

CRITICAL RULE: Output ONLY the exact response text that should be shown to the user. Speak directly to the user "${vendedor_id}" in Spanish using a professional but futuristic corporate tone.`;

                const executorModel = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const localRes = await executeWithRetry(() => executorModel.generateContent(executorPrompt));
                finalResponseText = localRes.response.text().trim();
                
                if (finalResponseText.startsWith('\`\`\`')) {
                    finalResponseText = finalResponseText.replace(/^\`\`\`[\s\S]*?\n/, '').replace(/\`\`\`$/, '').trim();
                }
                
                console.log("[EXECUTOR FINAL]", finalResponseText);
            } catch (execErr) {
                console.error("[EXECUTOR] Error:", execErr.message);
                finalResponseText = "Error en el Ejecutor Híbrido: Fallo en la matriz de síntesis.";
            }

            return {
                response: finalResponseText,
                shouldCreateNode: parsedPlan.shouldCreateNode,
                nodeData: parsedPlan.shouldCreateNode ? { title: parsedPlan.nodeTitle, content: parsedPlan.nodeContent } : null,
                showWorkflowButtons: parsedPlan.showWorkflowButtons,
                hideWorkflowButtons: parsedPlan.hideWorkflowButtons
            };

        } catch (error) {
            console.error('[AI ROUTER] Error:', error);
            return {
                response: "Error catastrófico en el enlace orquestador.",
                shouldCreateNode: false,
                nodeData: null
            };
        }
    }

    async summarizeNode(topic, fileName, content) {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `You are a Cyberpunk 2077 AI. Give a concise, 2-sentence summary in Spanish of this node from the user's brain.
Topic: ${topic}
Filename: ${fileName}
Content:
${content}
Make it sound like you just scanned a data shard.`;

            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (e) {
            console.error("[SUMMARIZE] Error:", e);
            return "Error al desencriptar el fragmento de memoria.";
        }
    }
}

module.exports = AIRouter;
