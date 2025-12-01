
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { PersonIncome, PersonAnalysisRegion } from '../types';

export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyError';
  }
}

const getAiClient = () => {
  if (!process.env.API_KEY) {
      throw new ApiKeyError("API key is not configured. Please select an API key.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const handleApiError = (error: any, fallbackMessage: string) => {
    if (error instanceof ApiKeyError) {
        throw error;
    }

    console.error("Gemini API Error:", error);
    const errorMessage = error.message || String(error);

    const keyErrorIndicators = [
        'api key not valid',
        'permission_denied',
        'requested entity was not found',
        'api key is invalid'
    ];
    
    const quotaErrorIndicators = [
        '429',
        'resource has been exhausted',
        'quota',
        'rate limit'
    ];

    if (keyErrorIndicators.some(indicator => errorMessage.toLowerCase().includes(indicator))) {
        throw new ApiKeyError("Your API key seems to be be invalid or lacks permissions. Please select a different one.");
    }

    if (quotaErrorIndicators.some(indicator => errorMessage.toLowerCase().includes(indicator))) {
        throw new ApiKeyError("You've exceeded your API quota. Please try again later or select a different API key.");
    }
    
    throw new Error(fallbackMessage);
};


const incomeSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: "The full name of the person.",
      },
      income: {
        type: Type.NUMBER,
        description: "The annual income as a numeric value, without currency symbols or commas.",
      },
    },
    required: ["name", "income"],
  },
};

export interface JobAnalysisResult {
  status: 'found' | 'not_found' | 'error' | 'other';
  jobTitle: string | null;
  keySentence: string | null;
  reasoning: string;
}

const jobAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        status: {
            type: Type.STRING,
            description: "Set to 'found' if a job title is identified. Set to 'not_found' if the screen explicitly says no results were found or the person is not mentioned. Set to 'other' for ambiguous cases.",
        },
        jobTitle: {
            type: Type.STRING,
            description: "The extracted job title (e.g., 'Заместитель генерального директора', 'Главный инженер'). Return null if not found.",
        },
        keySentence: {
            type: Type.STRING,
            description: "A single, concise key sentence from the text that confirms the person's role or context. Return null if not applicable.",
        },
        reasoning: {
            type: Type.STRING,
            description: "A brief explanation for your conclusion.",
        }
    },
    required: ["status", "jobTitle", "keySentence", "reasoning"],
};

export interface PersonJobAnalysisResult extends JobAnalysisResult {
    personName: string | null;
}

const personJobAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        personName: {
            type: Type.STRING,
            description: "The full name of the person identified in the screenshot. If no name can be confidently identified, return null.",
        },
        status: {
            type: Type.STRING,
            description: "Set to 'found' if a job title is identified for the person. Set to 'not_found' if the screen explicitly says no results were found or the person is not mentioned. Set to 'other' for ambiguous cases.",
        },
        jobTitle: {
            type: Type.STRING,
            description: "The extracted job title (e.g., 'Заместитель генерального директора', 'Главный инженер'). Return null if not found.",
        },
        keySentence: {
            type: Type.STRING,
            description: "A single, concise key sentence from the text that confirms the person's role or context. Return null if not applicable.",
        },
        reasoning: {
            type: Type.STRING,
            description: "A brief explanation for your conclusion.",
        }
    },
    required: ["personName", "status", "jobTitle", "keySentence", "reasoning"],
};

const multiplePersonAnalysisSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            personName: {
                type: Type.STRING,
                description: "The full name (ФИО) of the person extracted from the text inside the orange-colored box.",
            },
            analysisSummary: {
                type: Type.STRING,
                description: "The summary text found directly below the corresponding orange box.",
            },
            boundingBox: {
                type: Type.OBJECT,
                properties: {
                    x: { type: Type.INTEGER, description: "The top-left x-coordinate of the crop area." },
                    y: { type: Type.INTEGER, description: "The top-left y-coordinate of the crop area." },
                    width: { type: Type.INTEGER, description: "The width of the crop area." },
                    height: { type: Type.INTEGER, description: "The height of the crop area." },
                },
                required: ["x", "y", "width", "height"],
                description: "A bounding box that encloses the orange box and its associated summary text.",
            },
        },
        required: ["personName", "analysisSummary", "boundingBox"],
    },
};

const nameExtractionSchema = {
    type: Type.OBJECT,
    properties: {
        fullName: {
            type: Type.STRING,
            description: "The full name (Фамилия Имя Отчество) of the person found in the text. If no full name is clearly identified, return null.",
        },
    },
    required: ["fullName"],
};

const summarySchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A brief, concise summary of the person's professional role and key facts from the text. This summary must exclude all contact information (phone numbers, emails), addresses, and website URLs.",
        },
    },
    required: ["summary"],
};

const nameAndSummarySchema = {
    type: Type.OBJECT,
    properties: {
        fullName: {
            type: Type.STRING,
            description: "The full name (Фамилия Имя Отчество) of the person found in the text. If no full name is clearly identified, return null.",
        },
        summary: {
            type: Type.STRING,
            description: "A brief, concise summary of the person's professional role and key facts from the text. This summary must exclude all contact information (phone numbers, emails), addresses, website URLs, the name 'Алиса', and any legal disclaimers.",
        },
        dateOfBirth: {
            type: Type.STRING,
            description: "The person's date of birth if found in the text (e.g., 'dd.mm.yyyy' or 'день рождения: ...'). Return null if not found.",
        },
    },
    required: ["fullName", "summary"],
};

const nameSummaryAndBboxSchema = {
    type: Type.OBJECT,
    properties: {
        fullName: {
            type: Type.STRING,
            description: "The full name (Фамилия Имя Отчество) of the person found in the text that matches the requested name. If no matching name is clearly identified, return null.",
        },
        summary: {
            type: Type.STRING,
            description: "A brief, concise summary of the person's professional role and key facts from the text. Must exclude all contact info, URLs, 'Алиса', and legal disclaimers. If the requested person is not found, this field should explain that and list the names that are visible.",
        },
        dateOfBirth: {
            type: Type.STRING,
            description: "The person's date of birth if found in the text (e.g., 'dd.mm.yyyy'). Return null if not found.",
        },
        boundingBox: {
            type: Type.OBJECT,
            properties: {
                x: { type: Type.INTEGER, description: "The top-left x-coordinate of the crop area." },
                y: { type: Type.INTEGER, description: "The top-left y-coordinate of the crop area." },
                width: { type: Type.INTEGER, description: "The width of the crop area." },
                height: { type: Type.INTEGER, description: "The height of the crop area." },
            },
            required: ["x", "y", "width", "height"],
            description: "A PRECISE bounding box that encloses the person's information block. It should start at the top of their name, include the summary, and end right after the last piece of relevant text or UI element for that person. If the person cannot be found, return null for this entire object.",
        },
    },
    required: ["fullName", "summary"],
};

export async function analyzeIncomeFile(fileContent: string): Promise<PersonIncome[]> {
  try {
    const ai = getAiClient();
    const prompt = `
      You are an expert data extraction assistant.
      Analyze the following text which contains a list of people and their annual incomes.
      Extract each person's full name and their income as a number.
      Ignore any currency symbols, formatting, or non-numeric characters in the income value.
      Provide the output as a JSON array of objects, where each object has a "name" (string) and "income" (number) key.
      Ensure the output is a valid JSON array and nothing else.

      Here is the text:
      ---
      ${fileContent}
      ---
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: incomeSchema,
      },
    });

    const jsonText = response.text.trim();
    const data = JSON.parse(jsonText);

    if (!Array.isArray(data)) {
        throw new Error("AI response was not a JSON array.");
    }

    return data as PersonIncome[];
  } catch (error) {
    handleApiError(error, "Failed to analyze the file. The AI could not process the content. Please check the file format.");
    return []; // Should not be reached
  }
}

export async function analyzeScreenFrame(prompt: string, imageBase64: string): Promise<string> {
  try {
    const ai = getAiClient();
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    };
    const textPart = {
      text: prompt,
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
    });

    return response.text;
  } catch (error) {
    handleApiError(error, "Failed to analyze the screen frame. The AI could not process the content.");
    return ""; // Should not be reached
  }
}

export async function analyzeJobScreen(personName: string, imageBase64: string): Promise<JobAnalysisResult> {
    try {
        const ai = getAiClient();
        const imagePart = {
            inlineData: { mimeType: 'image/jpeg', data: imageBase64 },
        };

        const prompt = `
            Analyze the screenshot to find information about the person named "${personName}".
            The user is searching for this person's job title in a database or on a website.

            Determine the outcome of the search based on the screenshot content.
            1.  If you find a specific job title for "${personName}" (e.g., 'директор', 'заместитель', 'инженер'), set status to 'found' and extract the job title and a key sentence confirming it.
            2.  If the screen explicitly shows a "no results found" message, "информация отсутствует", or similar negative indicators, set status to 'not_found'.
            3.  For any other case (e.g., ambiguous results, multiple people with the same name), set status to 'other'.

            Respond ONLY with a JSON object matching the provided schema.
        `;

        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: jobAnalysisSchema,
            },
        });

        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        return data as JobAnalysisResult;
    } catch (error) {
        handleApiError(error, "Failed to communicate with the analysis service or parse its response.");
        return {
            status: 'error',
            jobTitle: null,
            keySentence: null,
            reasoning: "An unexpected error occurred.",
        }; // Should not be reached
    }
}

export async function analyzeScreenAndIdentifyPerson(imageBase64: string): Promise<PersonJobAnalysisResult> {
    try {
        const ai = getAiClient();
        const imagePart = { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } };

        const prompt = `
            Analyze the screenshot to find the full name of the primary person being discussed and their job title.
            The user is searching for information about individuals.

            Your task is to:
            1.  Identify the full name (ФИО) of the person. If multiple names are present, focus on the main subject. If no name is clearly identifiable, return null for personName.
            2.  Determine the outcome of the search for this person.
            3.  If you find a specific job title (e.g., 'директор', 'заместитель', 'инженер'), set status to 'found' and extract the job title and a key sentence confirming it.
            4.  If the screen explicitly shows a "no results found" message, "информация отсутствует", or similar negative indicators, set status to 'not_found'.
            5.  For any other case (e.g., ambiguous results, multiple people), set status to 'other'.

            Respond ONLY with a JSON object matching the provided schema.
        `;

        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: personJobAnalysisSchema,
            },
        });

        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        return data as PersonJobAnalysisResult;
    } catch (error) {
        handleApiError(error, "Failed to communicate with the analysis service or parse its response.");
        return {
            personName: null,
            status: 'error',
            jobTitle: null,
            keySentence: null,
            reasoning: "An unexpected error occurred.",
        }; // Should not be reached
    }
}

export async function analyzeScreenshotForMultiplePeople(imageBase64: string): Promise<PersonAnalysisRegion[]> {
    try {
        const ai = getAiClient();
        const imagePart = { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } };

        const prompt = `
            Analyze the screenshot to find all people presented in distinct orange boxes.
            For each person, you must:
            1.  **Extract Name**: Get the full name (ФИО) from the orange box.
            2.  **Extract Summary**: Get the entire text block below the orange box.
            3.  **Define a PRECISE Bounding Box**: Create a bounding box for cropping based on these strict rules:
                - **'y' (top)**: Must start at the very top edge of the orange box containing the person's name.
                - **'x' (left)**: Must start at the beginning of the main text block (which usually begins with an avatar and the name "Алиса"). Do NOT align with the screen's left edge.
                - **'height' (bottom)**: The box must extend downwards to fully include the row of pill-shaped link buttons (e.g., vuzopedia.ru). The bottom edge MUST be ABOVE the like/dislike thumb icons. Do NOT include the like/dislike icons in the crop.
                - **'width' (right)**: The box must be wide enough to include all the text and links on the right side.
            
            Return the result as a JSON array. Each object in the array must match the schema and represent one person. If no valid people are found, return an empty array [].
        `;

        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: multiplePersonAnalysisSchema,
            },
        });

        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);

        if (!Array.isArray(data)) {
            throw new Error("AI response was not a JSON array.");
        }

        return data as PersonAnalysisRegion[];
    } catch (error) {
        handleApiError(error, "Failed to analyze screenshot for multiple people.");
        return []; // Should not be reached
    }
}

export async function extractNameFromText(text: string): Promise<string | null> {
    try {
        const ai = getAiClient();
        const prompt = `
            Analyze the following text and extract the single, primary full name (Фамилия Имя Отчество) of the person being discussed.
            - The name should be a complete full name (e.g., "Иванов Иван Иванович").
            - If multiple names are present, identify the main subject of the text.
            - If no full name can be confidently identified, return null.

            Text to analyze:
            ---
            ${text}
            ---

            Respond ONLY with a JSON object matching the provided schema.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: nameExtractionSchema,
            },
        });

        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);

        return (data.fullName as string | null) || null;
    } catch (error) {
        handleApiError(error, "Failed to extract name from text.");
        return null; // Should not be reached
    }
}

export async function summarizeAnalysisText(text: string): Promise<string | null> {
    try {
        const ai = getAiClient();
        const prompt = `
            Analyze the following text about a person. Create a brief, concise summary focusing only on their professional role, achievements, and key biographical facts relevant to their career.

            **Crucially, you MUST OMIT the following from your summary:**
            - All phone numbers (e.g., (3412) 917-357)
            - All email addresses (e.g., mariv@udm.ru)
            - All website URLs and domain names (e.g., udsu.ru, vk.com, t.me)
            - Any mention of "PKH" or similar legal warnings.
            - The name "Алиса" or any phrases like "На основе источников, возможны неточности".

            Your output should be a clean, professional summary suitable for a personnel file.

            Text to analyze:
            ---
            ${text}
            ---

            Respond ONLY with a JSON object matching the provided schema.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: summarySchema,
            },
        });

        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);

        return (data.summary as string | null) || null;
    } catch (error) {
        handleApiError(error, "Failed to summarize text.");
        return null; // Should not be reached
    }
}

export async function extractNameAndSummarize(text: string): Promise<{ fullName: string | null; summary: string | null; dateOfBirth: string | null; }> {
    try {
        const ai = getAiClient();
        const prompt = `
            Analyze the following text about a person. Your task is to perform THREE actions:
            1.  **Extract Name**: Extract the single, primary full name (Фамилия Имя Отчество) of the person being discussed. If no full name can be confidently identified, return null for the name.
            2.  **Extract Date of Birth**: Find the person's date of birth (дата рождения). It might be in formats like "dd.mm.yyyy", "Родился/ась ...", etc. Extract it as a string. If not found, return null for the date of birth.
            3.  **Summarize**: Create a brief, concise summary focusing only on their professional role, achievements, and key biographical facts relevant to their career.

            **Crucially, you MUST OMIT the following from your summary:**
            - All phone numbers (e.g., (3412) 917-357)
            - All email addresses (e.g., mariv@udm.ru)
            - All website URLs and domain names (e.g., udsu.ru, vk.com, t.me)
            - Any mention of "PKH" or similar legal warnings.
            - The name "Алиса" or any phrases like "На основе источников, возможны неточности".

            Your output should be a clean, professional summary suitable for a personnel file.

            Text to analyze:
            ---
            ${text}
            ---

            Respond ONLY with a single JSON object matching the provided schema.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: nameAndSummarySchema,
            },
        });

        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        const dob = (data.dateOfBirth as string | null) || null;

        return {
            fullName: (data.fullName as string | null) || null,
            summary: (data.summary as string | null) || null,
            dateOfBirth: dob === 'null' ? null : dob,
        };
    } catch (error) {
        handleApiError(error, "Failed to extract name and summarize text.");
        return { fullName: null, summary: null, dateOfBirth: null }; // Should not be reached
    }
}

export interface PersonDetailsWithBoundingBox {
    fullName: string | null;
    summary: string | null;
    dateOfBirth: string | null;
    boundingBox: { x: number; y: number; width: number; height: number; } | null;
}

export async function analyzeScreenAndGetPersonDetailsWithBoundingBox(personName: string, imageBase64: string): Promise<PersonDetailsWithBoundingBox> {
    try {
        const ai = getAiClient();
        const imagePart = { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } };
        const prompt = `
            You are an expert visual data extraction assistant.
            Your primary goal is to locate an information block for a person in the screenshot, prioritizing the person named "${personName}".

            Your tasks are:
            1.  **Locate a Person Block**:
                - First, try to find the content block for "${personName}". Be flexible with slight name variations.
                - If you cannot find "${personName}", find the block for the most prominent or likely person on the screen.
            2.  **Define a PRECISE Bounding Box**: You MUST create a bounding box that tightly encloses this person's entire information block (their name, summary, and any related elements). A bounding box is always required unless the screen is completely blank or irrelevant.
            3.  **Extract Details from the Box**:
                - **fullName**: Extract the full name exactly as it appears inside the identified block.
                - **summary**: Provide a concise summary of the text within the box. If the person found is NOT "${personName}", the summary MUST start by stating this, for example: "Запрошенное имя '${personName}' не найдено. Найдена информация для '{fullName from screen}'." Then, provide the summary for the person found.
                - **dateOfBirth**: Extract the date of birth if present.

            **CRITICAL RULES:**
            - You MUST return a \`boundingBox\` if there is any person's information block visible on the screen.
            - Only return \`null\` for \`boundingBox\`, \`fullName\`, and \`dateOfBirth\` if the screen shows no people, is an empty search result, or is from a completely different application. In this case, the summary should explain why no data was extracted.

            Respond ONLY with a single JSON object matching the provided schema.
        `;

        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: nameSummaryAndBboxSchema,
            },
        });

        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        const dob = (data.dateOfBirth as string | null) || null;

        return {
            fullName: (data.fullName as string | null) || null,
            summary: (data.summary as string | null) || null,
            dateOfBirth: dob === 'null' ? null : dob,
            boundingBox: data.boundingBox || null,
        };
    } catch (error) {
        handleApiError(error, "Failed to analyze screen for person details with bounding box.");
        return { fullName: null, summary: null, dateOfBirth: null, boundingBox: null };
    }
}
