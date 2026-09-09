import { supabase, isTableMissingError } from "./supabase";
import * as fs from "fs";
import * as path from "path";

export interface User {
  id: string;
  username: string;
  email?: string;
  password_hash: string;
  full_name?: string;
  school_name?: string;
  role?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  school_name?: string;
  role?: string;
  created_at: string;
}

export interface RegisterDTO {
  username: string;
  password: string;
  email?: string;
  full_name?: string;
  school_name?: string;
}

export interface LoginDTO {
  username: string;
  password: string;
}

// ==============================================================================
// 1. Password Hashing using Bun's native Argon2id
// ==============================================================================
export async function hashPassword(password: string): Promise<string> {
  // Bun.password.hash with argon2id algorithm
  return await Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 2,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

export function sanitizeUser(user: User): UserProfile {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    school_name: user.school_name,
    role: user.role || "teacher",
    created_at: user.created_at,
  };
}

// ==============================================================================
// 2. Local File Fallback Store (backend/src/data/users.json)
// ==============================================================================
const LOCAL_USERS_PATH = path.resolve(import.meta.dir, "../data/users.json");

let isSeedingDefault = false;

async function getLocalUsers(): Promise<User[]> {
  try {
    if (!fs.existsSync(LOCAL_USERS_PATH)) {
      fs.mkdirSync(path.dirname(LOCAL_USERS_PATH), { recursive: true });
      fs.writeFileSync(LOCAL_USERS_PATH, JSON.stringify([]));
    }
    const raw = fs.readFileSync(LOCAL_USERS_PATH, "utf-8");
    const users: User[] = JSON.parse(raw);

    // Seed default demo teacher user if empty
    if (users.length === 0 && !isSeedingDefault) {
      isSeedingDefault = true;
      const defaultHash = await hashPassword("password123");
      const defaultTeacher: User = {
        id: "demo-teacher-001",
        username: "teacher",
        email: "teacher@school.ac.th",
        password_hash: defaultHash,
        full_name: "นางสาวพีรภัทร พุ่มสิน",
        school_name: "โรงเรียนเทศบาล ๕ วัดพระปฐมเจดีย์",
        role: "teacher",
        created_at: new Date().toISOString(),
      };
      saveLocalUsers([defaultTeacher]);
      isSeedingDefault = false;
      return [defaultTeacher];
    }

    return users;
  } catch (err) {
    console.error("[Local Users] Failed to read users:", err);
    return [];
  }
}

function saveLocalUsers(users: User[]) {
  try {
    fs.mkdirSync(path.dirname(LOCAL_USERS_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_USERS_PATH, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("[Local Users] Failed to save users:", err);
  }
}

// ==============================================================================
// 3. User Database Operations (Supabase + Local Fallback)
// ==============================================================================

export async function findUserByUsername(username: string): Promise<User | null> {
  const normalized = username.trim().toLowerCase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("username", normalized)
        .maybeSingle();

      if (!error && data) {
        return data as User;
      }

      if (error && !isTableMissingError(error)) {
        console.error("[Supabase findUserByUsername error]:", error);
      }
    } catch (e) {
      // Fallback
    }
  }

  // Local fallback
  const local = await getLocalUsers();
  return local.find((u) => u.username.toLowerCase() === normalized) || null;
}

export async function findUserById(id: string): Promise<User | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!error && data) {
        return data as User;
      }
    } catch (e) {}
  }

  const local = await getLocalUsers();
  return local.find((u) => u.id === id) || null;
}

export async function createUser(dto: RegisterDTO): Promise<User> {
  const normalizedUsername = dto.username.trim();
  const passwordHash = await hashPassword(dto.password);

  const newUser: User = {
    id: crypto.randomUUID(),
    username: normalizedUsername,
    email: dto.email?.trim() || undefined,
    password_hash: passwordHash,
    full_name: dto.full_name?.trim() || normalizedUsername,
    school_name: dto.school_name?.trim() || undefined,
    role: "teacher",
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users")
        .insert({
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          password_hash: newUser.password_hash,
          full_name: newUser.full_name,
          school_name: newUser.school_name,
          role: newUser.role,
        })
        .select()
        .single();

      if (!error && data) {
        // Also sync local
        const local = await getLocalUsers();
        saveLocalUsers([...local, data as User]);
        return data as User;
      }

      if (error && isTableMissingError(error)) {
        console.warn(
          "[Supabase Notice] Table 'users' not found in Supabase. Saving to local storage."
        );
      } else if (error) {
        console.error("[Supabase createUser error]:", error);
      }
    } catch (e) {}
  }

  // Local save
  const local = await getLocalUsers();
  local.push(newUser);
  saveLocalUsers(local);
  return newUser;
}
