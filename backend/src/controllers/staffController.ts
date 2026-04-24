import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase';

// GET /api/staff?restaurant_id=xxx
export const getStaff = async (req: any, res: Response): Promise<void> => {
  try {
    const restaurant_id = req.user?.restaurant_id;
    if (!restaurant_id) {
      res.status(400).json({ error: 'Missing restaurant_id' });
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, xp, level, streak, created_at')
      .eq('restaurant_id', restaurant_id)
      .eq('role', 'Staff')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/staff  — Admin adds a staff member
export const addStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, restaurant_id } = req.body;

    if (!name || !email || !password || !restaurant_id) {
      res.status(400).json({ error: 'Missing required fields: name, email, password, restaurant_id' });
      return;
    }

    // Check email uniqueness
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      res.status(400).json({ error: 'A user with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, password: hashedPassword, role: 'Staff', restaurant_id }])
      .select('id, name, email, xp, level, streak, created_at')
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// DELETE /api/staff/:id
export const deleteStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('role', 'Staff'); // Safety: can only delete Staff, never Admins

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ message: 'Staff member removed' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/staff/stats?restaurant_id=xxx
export const getStats = async (req: any, res: Response): Promise<void> => {
  try {
    const restaurant_id = req.user?.restaurant_id;
    if (!restaurant_id) {
      res.status(400).json({ error: 'Missing restaurant_id' });
      return;
    }

    // 1. Total staff
    const { data: staffList, error: staffErr } = await supabase
      .from('users')
      .select('id, xp, level, streak')
      .eq('restaurant_id', restaurant_id)
      .eq('role', 'Staff');

    if (staffErr) {
      res.status(500).json({ error: staffErr.message });
      return;
    }

    const totalStaff = staffList?.length ?? 0;
    const avgXp = totalStaff > 0
      ? Math.round(staffList!.reduce((sum, s) => sum + (s.xp || 0), 0) / totalStaff)
      : 0;
    const avgLevel = totalStaff > 0
      ? Math.round(staffList!.reduce((sum, s) => sum + (s.level || 1), 0) / totalStaff)
      : 1;

    // 2. Total questions (approved) for this restaurant
    const { data: approvedQs } = await supabase
      .from('questions')
      .select('id')
      .eq('restaurant_id', restaurant_id)
      .eq('approved', true);
    const totalApproved = approvedQs?.length ?? 0;

    // 3. Progress stats from progress table
    const staffIds = (staffList ?? []).map(s => s.id);
    let completionRate = 0;
    let weakAreas: { question: string; failCount: number }[] = [];

    if (staffIds.length > 0 && totalApproved > 0) {
      // All progress entries for these staff
      const { data: progressRows } = await supabase
        .from('progress')
        .select('user_id, question_id, correct')
        .in('user_id', staffIds);

      if (progressRows && progressRows.length > 0) {
        const totalAttempts = progressRows.length;
        const correctAttempts = progressRows.filter(p => p.correct).length;
        completionRate = Math.round((correctAttempts / totalAttempts) * 100);

        // Group incorrect attempts by question
        const failMap: Record<string, number> = {};
        for (const row of progressRows) {
          if (!row.correct) {
            failMap[row.question_id] = (failMap[row.question_id] || 0) + 1;
          }
        }

        // Get top 3 most-failed question IDs
        const topFailIds = Object.entries(failMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([id]) => id);

        if (topFailIds.length > 0) {
          const { data: weakQs } = await supabase
            .from('questions')
            .select('id, question')
            .in('id', topFailIds);

          weakAreas = topFailIds.map(id => ({
            question: weakQs?.find(q => q.id === id)?.question ?? 'Unknown question',
            failCount: failMap[id],
          }));
        }
      }
    }

    res.status(200).json({
      totalStaff,
      avgXp,
      avgLevel,
      totalApprovedQuestions: totalApproved,
      completionRate,
      weakAreas,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};
