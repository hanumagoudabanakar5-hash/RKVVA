import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';

// @route POST /api/auth/signup
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, restaurant_id, restaurant_name } = req.body;

    if (!name || !email || !password || !role) {
       res.status(400).json({ error: 'Please provide all required fields' });
       return;
    }

    if (role !== 'Admin' && role !== 'Staff') {
       res.status(400).json({ error: 'Role must be either Admin or Staff' });
       return;
    }

    // --- Determine restaurant_id ---
    let resolvedRestaurantId: string | null = null;

    if (role === 'Admin') {
      // Admin: auto-create a new restaurant
      const rName = (restaurant_name || `${name}'s Restaurant`).trim();
      const { data: newRestaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert([{ name: rName }])
        .select('id')
        .single();

      if (restaurantError || !newRestaurant) {
        console.error('Restaurant creation error:', restaurantError);
        res.status(500).json({ error: 'Failed to create restaurant' });
        return;
      }
      resolvedRestaurantId = newRestaurant.id;
    } else {
      // Staff: must provide an existing restaurant_id from their Admin
      if (!restaurant_id) {
        res.status(400).json({ error: 'Staff must provide a Restaurant ID from their Admin' });
        return;
      }
      // Verify the restaurant exists
      const { data: existing, error: lookupErr } = await supabase
        .from('restaurants')
        .select('id')
        .eq('id', restaurant_id)
        .single();

      if (lookupErr || !existing) {
        res.status(400).json({ error: 'Restaurant ID not found. Ask your Admin for the correct ID.' });
        return;
      }
      resolvedRestaurantId = restaurant_id;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          name,
          email,
          password: hashedPassword,
          role,
          restaurant_id: resolvedRestaurantId,
        },
      ])
      .select('id, name, email, role, restaurant_id, created_at')
      .single();

    if (error) {
       console.error("Signup insert error:", error);
       res.status(500).json({ error: error.message });
       return;
    }

    // Generate JWT
    const payload = {
      user: {
        id: data.id,
        role: data.role,
        restaurant_id: data.restaurant_id
      },
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ token, user: data });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Please provide email and password' });
      return;
    }

    // Fetch user by email
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error) {
      console.error("Login fetch error:", error);
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (!users || users.length === 0) {
      res.status(400).json({ error: 'Invalid Credentials' });
      return;
    }

    const user = users[0];

    // Check pass
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
       res.status(400).json({ error: 'Invalid Credentials' });
       return;
    }

    // --- Daily streak update ---
    const now = new Date();
    const lastLogin = user.last_login ? new Date(user.last_login) : null;
    let newStreak = user.streak ?? 0;

    if (lastLogin) {
      const nowDay   = new Date(now.getFullYear(),  now.getMonth(),  now.getDate());
      const lastDay  = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
      const diffDays = Math.round((nowDay.getTime() - lastDay.getTime()) / 86400000);

      if (diffDays === 0) {
        // Same day — no change
      } else if (diffDays === 1) {
        newStreak = (user.streak ?? 0) + 1; // Consecutive day
      } else {
        newStreak = 1; // Gap — reset
      }
    } else {
      newStreak = 1; // First login ever
    }

    await supabase
      .from('users')
      .update({ streak: newStreak, last_login: now.toISOString() })
      .eq('id', user.id);

    user.streak = newStreak;
    user.last_login = now.toISOString();

    // Generate token
    const payload = {
      user: {
        id: user.id,
        role: user.role,
        restaurant_id: user.restaurant_id
      },
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    // Exclude password from response
    delete user.password;

    res.json({ token, user });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
