import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// ── Level thresholds ──────────────────────────────────────────────────────────
export const LEVELS = [
  { level: 1, name: 'Beginner',     minXp: 0,   maxXp: 100  },
  { level: 2, name: 'Menu Learner', minXp: 101, maxXp: 300  },
  { level: 3, name: 'Service Pro',  minXp: 301, maxXp: 600  },
  { level: 4, name: 'Sales Expert', minXp: 601, maxXp: null },
];

export function calculateLevel(xp: number): { level: number; name: string } {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) return { level: LEVELS[i].level, name: LEVELS[i].name };
  }
  return { level: 1, name: 'Beginner' };
}

// ── POST /api/progress/submit ─────────────────────────────────────────────────
// Body: { user_id, answers: [{ question_id, correct: boolean }] }
export const submitProgress = async (req: any, res: Response): Promise<void> => {
  try {
    const { answers } = req.body;
    const user_id = req.user?.id;

    if (!user_id || !Array.isArray(answers) || answers.length === 0) {
      res.status(400).json({ error: 'User session or answers array missing' });
      return;
    }

    // 1. Calculate base XP + streak bonuses
    let baseXp = 0;
    let bonusXp = 0;
    let inARow = 0;

    for (const a of answers) {
      if (a.correct) {
        baseXp += 10;
        inARow++;
        // Award +20 for every group of 3 consecutive correct answers
        if (inARow > 0 && inARow % 3 === 0) bonusXp += 20;
      } else {
        inARow = 0;
      }
    }
    const xpEarned = baseXp + bonusXp;

    // 2. Persist each answer row to progress table
    const progressRows = answers.map((a: any) => ({
      user_id,
      question_id: a.question_id,
      correct: a.correct,
    }));
    await supabase.from('progress').insert(progressRows);

    // 3. Fetch current user XP
    const { data: currentUser, error: fetchErr } = await supabase
      .from('users')
      .select('xp, level, streak')
      .eq('id', user_id)
      .single();

    if (fetchErr || !currentUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // 4. Compute new totals
    const newXp = (currentUser.xp ?? 0) + xpEarned;
    const { level: newLevel, name: levelName } = calculateLevel(newXp);

    // 5. Persist updated XP + level
    await supabase
      .from('users')
      .update({ xp: newXp, level: newLevel })
      .eq('id', user_id);

    res.status(200).json({
      xpEarned,
      baseXp,
      bonusXp,
      newXp,
      newLevel,
      levelName,
      levels: LEVELS,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/progress/weak-areas/:restaurant_id
// Returns the top 5 most-failed questions for a restaurant
export const getWeakAreas = async (req: any, res: Response): Promise<void> => {
  try {
    const restaurant_id = req.user?.restaurant_id;
    if (!restaurant_id) {
      res.status(400).json({ error: 'Missing restaurant_id' });
      return;
    }

    // 1. Fetch all approved question IDs for this restaurant
    const { data: restaurantQs, error: qErr } = await supabase
      .from('questions')
      .select('id, question')
      .eq('restaurant_id', restaurant_id)
      .eq('approved', true);

    if (qErr || !restaurantQs || restaurantQs.length === 0) {
      res.status(200).json([]);
      return;
    }

    const questionIds = restaurantQs.map(q => q.id);

    // 2. Fetch all wrong answers for those questions
    const { data: wrongRows, error: pErr } = await supabase
      .from('progress')
      .select('question_id')
      .in('question_id', questionIds)
      .eq('correct', false);

    if (pErr || !wrongRows || wrongRows.length === 0) {
      res.status(200).json([]);
      return;
    }

    // 3. Count fails per question
    const failMap: Record<string, number> = {};
    for (const row of wrongRows) {
      failMap[row.question_id] = (failMap[row.question_id] || 0) + 1;
    }

    // 4. Sort and return top 5
    const result = Object.entries(failMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, failCount]) => ({
        question_id: id,
        question: restaurantQs.find(q => q.id === id)?.question ?? 'Unknown question',
        failCount,
      }));

    res.status(200).json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

