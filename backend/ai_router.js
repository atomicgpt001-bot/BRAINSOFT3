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

    async processMessage(message, currentTopic, files = [], obsidianManager, vendedor_id = 'Unknown', sql = null, persona = 'icaro') {
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
            
            let profiles = {};
            try {
                profiles = JSON.parse(fs.readFileSync(path.join(__dirname, 'profiles.json'), 'utf8'));
            } catch(e) {}
            let userProfile = profiles[vendedor_id] || { userName: vendedor_id, botName: persona === 'soft3' ? 'Soft 3' : 'Icaro' };

            let prompt = "";
            if (persona === 'soft3') {
                prompt = `You are the official bot of Soft 3. 
The user talking to you is named: "${userProfile.userName}".
The user wants you to act and be called as: "${userProfile.botName}".
The user is talking about: "${currentTopic}".
Message from user: "${message}"
Has attached files: ${files.length > 0 ? 'Yes' : 'No'}

Your goal is to act as their corporate assistant and help them with queries about the Soft 3 architecture.
Task: Analyze the message.`;
            } else {
                prompt = `You are the Virtual Corporate Brain of Atomic (a tech and sales company).
The user talking to you is named: "${userProfile.userName}" (ID: ${vendedor_id}).
The user wants you to act and be called as: "${userProfile.botName}".
The user is talking about: "${currentTopic}".
Message from user: "${message}"
Has attached files: ${files.length > 0 ? 'Yes' : 'No'}

Your goal is to act as their virtual assistant, help them, and PROACTIVELY ask for their daily sales reports, client updates, and metrics.
If they provide metrics or client updates, you MUST save them using "saveReport" = true.
Task: Analyze the message.`;
            }
            
            prompt += `
OUTPUT STRICTLY JSON WITHOUT MARKDOWN. Format:
{
  "shouldCreateNode": boolean (true if you need to save a general note to Obsidian),
  "nodeTitle": "Brief descriptive title" (if creating node),
  "nodeContent": "Structured content to save to Obsidian" (if creating node),
  "saveReport": boolean (true if the user provided sales metrics, client updates, or daily stats that should be saved to the database),
  "reportData": { "tipo": "ventas|cliente|otro", "resumen": "...", "monto": 0 } (only if saveReport is true),
  "saveProfile": boolean (true ONLY if the user tells you their name, or tells you how they want YOU to be called),
  "userProfile": { "userName": "extracted user name", "botName": "extracted name they want to call you" } (only if saveProfile is true),
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
                    saveProfile: false,
                    instructionsForExecutor: "Responde amablemente.",
                    showWorkflowButtons: false,
                    hideWorkflowButtons: false
                };
            }

            if (parsedPlan.saveProfile && parsedPlan.userProfile) {
                try {
                    profiles[vendedor_id] = { 
                        userName: parsedPlan.userProfile.userName || userProfile.userName, 
                        botName: parsedPlan.userProfile.botName || userProfile.botName 
                    };
                    fs.writeFileSync(path.join(__dirname, 'profiles.json'), JSON.stringify(profiles, null, 2));
                    console.log("[PROFILE] Perfil guardado:", profiles[vendedor_id]);
                    userProfile = profiles[vendedor_id];
                } catch(e) {
                    console.error("[PROFILE] Error guardando perfil", e);
                }
            }

            if (parsedPlan.saveReport && sql) {
                try {
                    await sql`INSERT INTO reportes_ventas (vendedor_id, datos) VALUES (${vendedor_id}, ${parsedPlan.reportData})`;
                    console.log("[SUPABASE] Reporte guardado con éxito.");
                } catch (e) {
                    console.error("[SUPABASE] Error guardando reporte:", e);
                }
            }

            // FASE 2: EJECUTOR (Gemini Dual)
            let finalResponseText = "Conexión con Ejecutor fallida.";
            try {
                let executorPrompt = "";
                if (persona === 'soft3') {
                    executorPrompt = `You are ${userProfile.botName}.
Context Topic: "${currentTopic}"
User Input: "${message}"
Directive: ${parsedPlan.instructionsForExecutor}

CRITICAL RULE: Output ONLY the exact response text that should be shown to the user. Speak directly to the user "${userProfile.userName}" in Spanish using a professional, sober, and corporate tone.`;
                } else {
                    executorPrompt = `You are ${userProfile.botName} (a Virtual Corporate Brain).
Context Topic: "${currentTopic}"
User Input: "${message}"
Directive: ${parsedPlan.instructionsForExecutor}

CRITICAL RULE: Output ONLY the exact response text that should be shown to the user. Speak directly to the user "${userProfile.userName}" in Spanish using a professional but futuristic corporate tone.`;
                }

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
