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

export async function refineTicketsWithGemini(tickets: TicketToRefine[], apiKey: string): Promise<RefinedTicket[]> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
            responseMimeType: 'application/json',
        },
    });

    // Construct a prompt that asks for JSON output
    const prompt = `
    You are a professional editor for facility management reports.
    I will provide a list of maintenance tickets.
    Your task is to refine the "title", "description", "location", and "category" of each ticket to be more professional, concise, and grammatically correct English.
    
    Rules:
    1. Fix grammar and spelling errors.
    2. Translate any Malay words or phrases into professional English (e.g., "Tingkat" -> "Floor", "Block" -> "Block", "Tandas" -> "Toilet").
    3. Use professional terminology (e.g., "broken lamp" -> "Luminary malfunction", "toilet cant flush" -> "Flushing mechanism failure", "aircond tak sejuk" -> "Air conditioning unit cooling failure").
    4. For "category", ensure it maps to one of these professional terms: "Plumbing & sanitary", "Electrical", "Mechanical / HVAC", "Building Structural", "Security & Safety", "Civil", or "Other".
    5. Keep the meaning accurate to the original issue.
    6. Return ONLY a JSON array of objects. Each object must have:
       - "id": (same as input)
       - "refinedTitle": (the polished title)
       - "refinedDescription": (the polished description)
       - "refinedLocation": (the polished location)
       - "refinedCategory": (the polished category)

    Input Tickets:
    ${JSON.stringify(tickets, null, 2)}
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present (Gemini often wraps JSON in ```json ... ```)
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonString = extractJsonArray(cleaned) ?? cleaned;

        const parsed = JSON.parse(jsonString);
        const refinedTickets = Array.isArray(parsed) ? parsed : parsed?.refined;
        if (!Array.isArray(refinedTickets)) {
            throw new Error('Invalid AI response format: expected JSON array');
        }
        return refinedTickets as RefinedTicket[];
    } catch (error) {
        console.error('Error refining tickets with Gemini:', error);
        throw new Error('Failed to refine tickets with AI');
    }
}
