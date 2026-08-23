export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      comments: {
        Row: {
          id: string
          recipe_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      featured_creators: {
        Row: {
          id: string
          display_name: string
          username: string
          avatar_url: string | null
          bio: string | null
          country: string | null
          verified: boolean
          is_premium: boolean
          followers_seed: number
          created_at: string
        }
        Insert: {
          id?: string
          display_name: string
          username: string
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          verified?: boolean
          is_premium?: boolean
          followers_seed?: number
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          username?: string
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          verified?: boolean
          is_premium?: boolean
          followers_seed?: number
          created_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          id: string
          user_id: string
          recipe_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recipe_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          recipe_id?: string
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          content: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          content: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          content?: string
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          username: string | null
          avatar_url: string | null
          bio: string | null
          subscription_tier: string
          created_at: string
          updated_at: string
          currency: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          username?: string | null
          avatar_url?: string | null
          bio?: string | null
          subscription_tier?: string
          created_at?: string
          updated_at?: string
          currency?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          username?: string | null
          avatar_url?: string | null
          bio?: string | null
          subscription_tier?: string
          created_at?: string
          updated_at?: string
          currency?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string | null
          video_url: string | null
          thumbnail_url: string | null
          cost_estimate: string | null
          cook_time: string | null
          ingredients: string[]
          steps: string[]
          tags: string[]
          view_count: number
          like_count: number
          save_count: number
          comment_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description?: string | null
          video_url?: string | null
          thumbnail_url?: string | null
          cost_estimate?: string | null
          cook_time?: string | null
          ingredients?: string[]
          steps?: string[]
          tags?: string[]
          view_count?: number
          like_count?: number
          save_count?: number
          comment_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string | null
          video_url?: string | null
          thumbnail_url?: string | null
          cost_estimate?: string | null
          cook_time?: string | null
          ingredients?: string[]
          steps?: string[]
          tags?: string[]
          view_count?: number
          like_count?: number
          save_count?: number
          comment_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      saves: {
        Row: {
          id: string
          user_id: string
          recipe_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recipe_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          recipe_id?: string
          created_at?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          id: string
          user_id: string
          media_url: string
          media_type: string
          caption: string | null
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          media_url: string
          media_type?: string
          caption?: string | null
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          media_url?: string
          media_type?: string
          caption?: string | null
          created_at?: string
          expires_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
    }
    Views: {}
    Enums: {
      app_role: "admin" | "creator" | "user"
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: string
        }
        Returns: boolean
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
