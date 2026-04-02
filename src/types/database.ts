/**
 * Supabase 数据库类型 - clone_tasks 表定义
 * 用于 task-store 等模块的 Supabase 操作
 * 可用: npx supabase gen types typescript --project-id $REF > src/types/database.ts 从实际库生成
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      clone_tasks: {
        Row: {
          id: string;
          user_id: string;
          clone_type: string;
          target_url: string | null;
          complexity: string;
          credits_used: number;
          status: string;
          progress: number;
          current_step: string | null;
          delivery_mode: string;
          target_language: string;
          quality_score: number | null;
          retry_count: number;
          r2_key: string | null;
          local_zip_path: string | null;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          clone_type?: string;
          target_url?: string | null;
          complexity: string;
          credits_used: number;
          delivery_mode?: string;
          target_language?: string;
          status?: string;
          progress?: number;
          current_step?: string | null;
          quality_score?: number | null;
          retry_count?: number;
          r2_key?: string | null;
          local_zip_path?: string | null;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: never;
          user_id?: string;
          clone_type?: string;
          target_url?: string | null;
          complexity?: string;
          credits_used?: number;
          status?: string;
          progress?: number;
          current_step?: string | null;
          delivery_mode?: string;
          target_language?: string;
          quality_score?: number | null;
          retry_count?: number;
          r2_key?: string | null;
          local_zip_path?: string | null;
          error_message?: string | null;
          created_at?: never;
          completed_at?: string | null;
        };
      };
      platform_config: {
        Row: {
          key: string;
          value: Json;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: never;
          value?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      platform_admins: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          role: string;
          last_login_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          role?: string;
          last_login_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          email?: string;
          password_hash?: string;
          role?: string;
          last_login_at?: string | null;
          created_at?: string;
        };
      };
      task_costs: {
        Row: {
          id: string;
          task_id: string;
          firecrawl_cost_cents: number;
          decodo_cost_cents: number;
          playwright_cost_cents: number;
          claude_input_tokens: number;
          claude_output_tokens: number;
          claude_input_cost_cents: number;
          claude_output_cost_cents: number;
          docker_cost_cents: number;
          r2_cost_cents: number;
          total_cost_cents: number;
          charged_cents: number;
          profit_cents: number;
          profit_multiplier: number;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          firecrawl_cost_cents?: number;
          decodo_cost_cents?: number;
          playwright_cost_cents?: number;
          claude_input_tokens?: number;
          claude_output_tokens?: number;
          claude_input_cost_cents?: number;
          claude_output_cost_cents?: number;
          docker_cost_cents?: number;
          r2_cost_cents?: number;
          total_cost_cents?: number;
          charged_cents?: number;
          profit_cents?: number;
          profit_multiplier?: number;
          calculated_at?: string;
        };
        Update: {
          task_id?: string;
          firecrawl_cost_cents?: number;
          decodo_cost_cents?: number;
          playwright_cost_cents?: number;
          claude_input_tokens?: number;
          claude_output_tokens?: number;
          claude_input_cost_cents?: number;
          claude_output_cost_cents?: number;
          docker_cost_cents?: number;
          r2_cost_cents?: number;
          total_cost_cents?: number;
          charged_cents?: number;
          profit_cents?: number;
          profit_multiplier?: number;
          calculated_at?: string;
        };
      };
      hosted_sites: {
        Row: {
          id: string;
          user_id: string;
          clone_task_id: string;
          github_repo_url: string | null;
          github_repo_name: string | null;
          railway_project_id: string | null;
          railway_service_id: string | null;
          railway_deployment_url: string | null;
          custom_domain: string | null;
          domain_verified: boolean;
          hosting_plan: string;
          stripe_subscription_id: string | null;
          status: string;
          railway_budget_used: number;
          created_at: string;
          suspended_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          clone_task_id: string;
          github_repo_url?: string | null;
          github_repo_name?: string | null;
          railway_project_id?: string | null;
          railway_service_id?: string | null;
          railway_deployment_url?: string | null;
          custom_domain?: string | null;
          domain_verified?: boolean;
          hosting_plan?: string;
          stripe_subscription_id?: string | null;
          status?: string;
          railway_budget_used?: number;
          created_at?: string;
          suspended_at?: string | null;
        };
        Update: {
          id?: never;
          user_id?: string;
          clone_task_id?: string;
          github_repo_url?: string | null;
          github_repo_name?: string | null;
          railway_project_id?: string | null;
          railway_service_id?: string | null;
          railway_deployment_url?: string | null;
          custom_domain?: string | null;
          domain_verified?: boolean;
          hosting_plan?: string;
          stripe_subscription_id?: string | null;
          status?: string;
          railway_budget_used?: number;
          created_at?: string;
          suspended_at?: string | null;
        };
      };
    };
    Views: { [key: string]: never };
    Functions: { [key: string]: never };
    Enums: { [key: string]: never };
  };
}
