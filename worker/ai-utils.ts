import { GoogleGenerativeAI } from '@google/generative-ai';

// Interface for the input ticket data
export interface TicketToRefine {
    id: string;
    title: string;
    description: string;
    location: string;
    category: string;
}

// Interface for the output refined data
export interface RefinedTicket {
    id: string;
    refinedTitle: string;
    refinedDescription: string;
    refinedLocation: string;
    refinedCategory: string;
}

function extractJsonArray(text: string): string | null {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) return null;
    return text.slice(start, end + 1);
}


export async function refineTicketsWithAI(tickets: TicketToRefine[], ai: any): Promise<RefinedTicket[]> {
    const model = '@cf/meta/llama-3-8b-instruct';

    // Construct a prompt that asks for JSON output
    const systemPrompt = `
    You are a professional editor for facility management reports.
    Your task is to refine the "title", "description", "location", and "category" of each ticket to be more professional, concise, and grammatically correct English.
    
    Rules:
    1. Fix grammar and spelling errors.
    2. Translate any non-English words or phrases into professional English. Output must be English-only.
    3. Use professional terminology (e.g., "broken lamp" -> "Luminary malfunction", "toilet cant flush" -> "Flushing mechanism failure").
    4. For "category", ensure it maps to one of these professional terms: "Plumbing & sanitary", "Electrical", "Mechanical / HVAC", "Building Structural", "Security & Safety", "Civil", or "Other".
    5. Keep the meaning accurate to the original issue.
    6. Return ONLY a valid JSON array of objects. Do not wrap in markdown code blocks.
    7. Each object must have: id, refinedTitle, refinedDescription, refinedLocation, refinedCategory.
    8. IMPORTANT: The "id" field MUST return the EXACT same string as the input ticket "id". Do not modify, reformat, or truncate the ID.
    `;

    const userPrompt = `
    Here are the tickets to refine:
    ${JSON.stringify(tickets, null, 2)}
    
    Return ONLY the JSON array.
    `;

    try {
        const response = await ai.run(model, {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' } // Enforce JSON response if supported, otherwise prompt instruction helps
        });

        // Cloudflare AI response format varies slightly by model, but usually response.response is the text
        const text = response.response || response;

        // Clean up any potential markdown formatting
        const cleaned = typeof text === 'string' ? text.replace(/```json/g, '').replace(/```/g, '').trim() : JSON.stringify(text);

        // Extract JSON array if surrounded by other text
        const jsonString = extractJsonArray(cleaned) ?? cleaned;

        const parsed = JSON.parse(jsonString);
        const refinedTickets = Array.isArray(parsed) ? parsed : parsed?.refined || parsed?.tickets;

        if (!Array.isArray(refinedTickets)) {
            console.error('AI Response parsed:', parsed);
            throw new Error('Invalid AI response format: expected JSON array');
        }
        return refinedTickets as RefinedTicket[];

    } catch (error: any) {
        console.error('Error refining tickets with Cloudflare AI:', error);
        throw new Error(`AI refinement failed: ${error.message || String(error)}`);
    }
}
