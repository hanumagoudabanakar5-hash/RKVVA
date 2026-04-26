import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
// @ts-ignore
import mammoth from 'mammoth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper: Chunk text into approximately 300 words with 50 word overlap
function chunkText(text: string, maxWords = 300, overlapWords = 50): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const chunkOptions = words.slice(i, i + maxWords);
    chunks.push(chunkOptions.join(' '));
    i += (maxWords - overlapWords);
  }
  return chunks;
}

export const uploadFile = async (req: any, res: Response): Promise<void> => {
  try {
    const file: any = req.file;
    const { type } = req.body;
    const restaurant_id = req.user?.restaurant_id;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    if (!restaurant_id || !type) {
      res.status(400).json({ error: 'Missing restaurant_id or type (menu/sop)' });
      return;
    }

    if (req.user?.role !== 'Admin') {
      res.status(403).json({ error: 'Access denied. Only administrators can upload training materials.' });
      return;
    }

    // 1. Upload File to Supabase Storage
    const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('restaurant-docs')
      .upload(`${restaurant_id}/${fileName}`, file.buffer, {
        contentType: file.mimetype,
      });

    if (storageError || !storageData) {
      console.error("Supabase Storage Error:", storageError);
      res.status(500).json({ error: `Storage error: ${storageError?.message || "Unknown error"}` });
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('restaurant-docs').getPublicUrl(storageData.path);
    const fileUrl = publicUrlData.publicUrl;

    // 2. Extract Text
    let rawText = '';
    const extension = file.originalname.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
      try {
        console.log(`[FileService] Processing PDF: ${file.originalname}`);
        
        const pdfLib = require('pdf-parse');
        const PDFParseClass = pdfLib.PDFParse || pdfLib.default || pdfLib;
        
        let data;
        // Check if it's the new class-based API
        if (PDFParseClass.prototype && PDFParseClass.prototype.getText) {
          const parser = new PDFParseClass(file.buffer);
          data = await parser.getText();
          // Clean up if the method exists
          if (parser.destroy) await parser.destroy();
        } else {
          // Fallback to old function-style API
          data = await (PDFParseClass as any)(file.buffer);
        }

        rawText = data.text;
        
        if (!rawText || rawText.trim().length === 0) {
           console.warn("[FileService] PDF extraction returned empty text.");
           rawText = "This PDF appears to be an image or scanned document. Text extraction was unsuccessful.";
        } else {
           console.log(`[FileService] Successfully extracted ${rawText.length} characters from PDF.`);
        }
      } catch (pdfError: any) {
        console.error("[FileService] PDF Extraction Error:", pdfError);
        res.status(500).json({ error: `Failed to process PDF content: ${pdfError.message}` });
        return;
      }
    } else if (extension === 'docx') {
      const docxData = await mammoth.extractRawText({ buffer: file.buffer });
      rawText = docxData.value;
    } else if (extension === 'txt' || extension === 'csv') {
      rawText = file.buffer.toString('utf-8');
    } else {
       res.status(400).json({ error: 'Unsupported file type. Use PDF, DOCX, TXT, CSV' });
       return;
    }

    // 3. Save File Record to DB
    const { data: dbFile, error: fileInsertError } = await supabase
      .from('files')
      .insert([
        {
          restaurant_id,
          file_url: fileUrl,
          file_name: file.originalname,
          type
        }
      ])
      .select()
      .single();

    if (fileInsertError || !dbFile) {
       console.error("File DB Error:", fileInsertError);
       res.status(500).json({ error: 'Failed to save file record' });
       return;
    }

    // 4. Chunking
    const textChunks = chunkText(rawText);

    // 5. Generate Embeddings & Store
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    
    // Process in batches or parallel to generate embeddings
    const chunkRows = [];
    for (const chunk of textChunks) {
      try {
        const result = await embeddingModel.embedContent(chunk);
        const embedding = result.embedding.values;
        
        chunkRows.push({
          restaurant_id,
          file_id: dbFile.id,
          content: chunk,
          embedding, 
          metadata: { originalName: file.originalname }
        });
      } catch (err) {
         console.error("Error generating embedding for chunk", err);
      }
    }

    if (chunkRows.length > 0) {
      const { error: chunkError } = await supabase
        .from('chunks')
        .insert(chunkRows);

      if (chunkError) {
         console.error("Chunk DB Error:", chunkError);
         res.status(500).json({ error: 'Failed to save chunks and embeddings' });
         return;
      }
    }

    res.status(200).json({ message: 'File processed and embedded successfully', file: dbFile, chunksProcessed: chunkRows.length });

  } catch (error: any) {
    console.error("Upload process error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getFiles = async (req: any, res: Response): Promise<void> => {
  try {
    const restaurant_id = req.user?.restaurant_id;
    if (!restaurant_id) {
       res.status(400).json({ error: 'Missing restaurant_id configuration' });
       return;
    }

    const { data: files, error } = await supabase
       .from('files')
       .select('*')
       .eq('restaurant_id', restaurant_id)
       .order('created_at', { ascending: false });

    if (error) {
       res.status(500).json({ error: error.message });
       return;
    }

    res.status(200).json(files);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};
