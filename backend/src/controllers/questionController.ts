import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const generateQuestions = async (req: any, res: Response): Promise<void> => {
  try {
    const { topic } = req.body;
    const restaurant_id = req.user?.restaurant_id;

    if (!restaurant_id || !topic) {
      res.status(400).json({ error: 'Missing restaurant_id or topic' });
      return;
    }

    // 1. Generate embedding for the topic
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const embeddingResult = await embeddingModel.embedContent(topic);
    const queryEmbedding = embeddingResult.embedding.values;

    // 2. Similarity search in Supabase using the match_chunks RPC
    const { data: chunks, error: rpcError } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.1, // Lower threshold to ensure we get results
      match_count: 5,
      p_restaurant_id: restaurant_id
    });

    if (rpcError) {
      console.error("Supabase RPC Error:", rpcError);
      res.status(500).json({ error: 'Failed to retrieve context chunks' });
      return;
    }

    if (!chunks || chunks.length === 0) {
      res.status(400).json({ error: 'No relevant training material found for this topic. Please upload more documents.' });
      return;
    }

    // 3. Construct prompt with retrieved context
    const contextText = chunks.map((chunk: any) => chunk.content).join('\n\n');
    
    const prompt = `You are a restaurant training assistant. Using the context below, generate 5 MCQ questions about ingredients, allergens, pairings, and upselling relevant to the topic: "${topic}". 
    
Context:
${contextText}

Return a raw JSON array. DO NOT wrap it in markdown code blocks like \`\`\`json. The JSON array must contain exactly 5 objects. Each object must strictly follow this structure:
{
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "Option B"
}`;

    // 4. Generate questions using gemini-1.5-flash
    const generationModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const response = await generationModel.generateContent(prompt);
    const responseText = response.response.text();
    
    // Clean up potential markdown blocks if the model adds them
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let generatedQuestions;
    try {
      generatedQuestions = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw output:", cleanedText);
      res.status(500).json({ error: 'AI returned invalid JSON format' });
      return;
    }

    if (!Array.isArray(generatedQuestions)) {
      res.status(500).json({ error: 'AI did not return an array of questions' });
      return;
    }

    // 5. Insert into Supabase questions table
    const questionsToInsert = generatedQuestions.map((q: any) => ({
      restaurant_id,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      approved: false
    }));

    const { data: savedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error("Insert Error:", insertError);
      res.status(500).json({ error: 'Failed to save questions to database' });
      return;
    }

    res.status(200).json({ message: 'Questions generated successfully', questions: savedQuestions });
  } catch (error: any) {
    console.error("Generate questions error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getQuestions = async (req: any, res: Response): Promise<void> => {
  try {
    const restaurant_id = req.user?.restaurant_id;
    if (!restaurant_id) {
       res.status(400).json({ error: 'Missing restaurant_id configuration' });
       return;
    }

    const { data: questions, error } = await supabase
       .from('questions')
       .select('*')
       .eq('restaurant_id', restaurant_id)
       .order('created_at', { ascending: false });

    if (error) {
       res.status(500).json({ error: error.message });
       return;
    }

    res.status(200).json(questions);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const getApprovedQuestions = async (req: any, res: Response): Promise<void> => {
  try {
    const restaurant_id = req.user?.restaurant_id;
    if (!restaurant_id) {
       res.status(400).json({ error: 'Missing restaurant_id' });
       return;
    }

    const { data: questions, error } = await supabase
       .from('questions')
       .select('*')
       .eq('restaurant_id', restaurant_id)
       .eq('approved', true)
       .order('created_at', { ascending: false });

    if (error) {
       res.status(500).json({ error: error.message });
       return;
    }

    res.status(200).json(questions);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/questions/lesson/:restaurant_id
// Returns 5-10 random approved questions per session
export const getLessonQuestions = async (req: any, res: Response): Promise<void> => {
  try {
    const restaurant_id = req.user?.restaurant_id;
    if (!restaurant_id) {
      res.status(400).json({ error: 'Missing restaurant_id' });
      return;
    }

    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, question, options, correct_answer, approved')
      .eq('restaurant_id', restaurant_id)
      .eq('approved', true);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (!questions || questions.length === 0) {
      res.status(200).json([]);
      return;
    }

    // Fisher-Yates shuffle
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Return 5–10 questions (or all if fewer than 5)
    const count = Math.min(10, Math.max(5, shuffled.length));
    res.status(200).json(shuffled.slice(0, count));

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const approveQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('questions')
      .update({ approved: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
       res.status(500).json({ error: error.message });
       return;
    }

    res.status(200).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const updateQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { question, options, correct_answer } = req.body;

    const { data, error } = await supabase
      .from('questions')
      .update({ question, options, correct_answer })
      .eq('id', id)
      .select()
      .single();

    if (error) {
       res.status(500).json({ error: error.message });
       return;
    }

    res.status(200).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) {
       res.status(500).json({ error: error.message });
       return;
    }

    res.status(200).json({ message: 'Question deleted successfully' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};
