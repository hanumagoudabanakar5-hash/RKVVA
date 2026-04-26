import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const askAssistant = async (req: any, res: Response): Promise<void> => {
  try {
    const { message, history } = req.body;
    const restaurant_id = req.user?.restaurant_id;
    const user_id = req.user?.id;

    console.log(`[Assistant] Message received: "${message}" for restaurant: ${restaurant_id}`);

    if (!message) {
      res.status(400).json({ error: 'Missing message' });
      return;
    }

    if (!restaurant_id) {
        console.warn("[Assistant] Missing restaurant_id in user metadata");
        res.status(400).json({ error: 'Missing restaurant context' });
        return;
    }

    // Save User Message to DB
    await supabase.from('chat_messages').insert({
        user_id,
        restaurant_id,
        role: 'user',
        content: message
    });

    // 1. Generate embedding for the user message
    console.log("[Assistant] Generating embedding...");
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const embeddingResult = await embeddingModel.embedContent(message);
    const queryEmbedding = embeddingResult.embedding.values;
    console.log(`[Assistant] Embedding generated (size: ${queryEmbedding.length})`);

    // 2. Similarity search in Supabase using the match_chunks RPC
    console.log("[Assistant] Searching for context chunks...");
    const { data: chunks, error: rpcError } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.1,
      match_count: 5,
      p_restaurant_id: restaurant_id
    });

    if (rpcError) {
      console.error("[Assistant] Supabase RPC Error:", rpcError);
      res.status(500).json({ error: `Database error: ${rpcError.message}` });
      return;
    }

    console.log(`[Assistant] Found ${chunks?.length || 0} context chunks`);

    // 3. Construct prompt with retrieved context and history
    const contextText = chunks && chunks.length > 0 
      ? chunks.map((chunk: any) => chunk.content).join('\n\n')
      : "No specific training material found for this query.";
    
    // Format history for the prompt
    const historyText = history && history.length > 0
      ? history.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')
      : "No previous conversation.";

    const prompt = `You are a helpful restaurant training assistant for staff and admin.
Using the context provided from the restaurant's training manuals, answer the user's question.
If the answer is not in the context, use your general knowledge but mention that it's not in the official manuals if appropriate.
Keep the tone professional and helpful.

Context:
${contextText}

Conversation History:
${historyText}

Current User Question: ${message}
Assistant:`;

    // 4. Generate answer using gemini-2.0-flash
    console.log("[Assistant] Requesting Gemini completion...");
    // Using gemini-2.0-flash explicitly as it is confirmed to be available
    const generationModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const response = await generationModel.generateContent(prompt);
    const responseText = response.response.text();
    console.log("[Assistant] Response generated successfully");

    // Save Assistant Response to DB
    await supabase.from('chat_messages').insert({
        user_id,
        restaurant_id,
        role: 'assistant',
        content: responseText
    });

    res.status(200).json({ 
        reply: responseText,
        chunks: chunks && chunks.length > 0 ? chunks.map((c: any) => ({
            id: c.id,
            content: c.content,
            metadata: c.metadata,
            similarity: c.similarity
        })) : []
    });
  } catch (error: any) {
    console.error("[Assistant] Error:", error);
    
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota')) {
        res.status(429).json({ 
            error: "The AI is currently at its capacity limit. Please wait a moment before asking again or upgrade your plan." 
        });
        return;
    }

    res.status(500).json({ error: error.message || "An unexpected error occurred" });
  }
};

export const getChatHistory = async (req: any, res: Response): Promise<void> => {
    try {
        const restaurant_id = req.user?.restaurant_id;
        const user_id = req.user?.id;

        if (!restaurant_id) {
            res.status(400).json({ error: 'Missing restaurant context' });
            return;
        }

        const { data, error } = await supabase
            .from('chat_messages')
            .select('role, content, created_at')
            .eq('restaurant_id', restaurant_id)
            .eq('user_id', user_id)
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) {
            res.status(500).json({ error: error.message });
            return;
        }

        res.status(200).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
