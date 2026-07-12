-- =====================================================================
-- Nomicierge マイグレーション 002: イベント作成機能
-- =====================================================================
-- 目的:
--   create.html + create-event Edge Function でイベントを新規作成できるよう、
--   events テーブルに「開催日」と「想定人数」の2カラムを追加する。
--
-- 適用方法:
--   Supabase ダッシュボード → SQL Editor にこのファイルを貼り付けて Run。
--   既存プロジェクト向け(setup.sql 実行済み)を想定。新規インストールは
--   setup.sql に同じ列が入っているので本ファイルの実行は不要。
--   add column if not exists のため、二重実行しても安全(冪等)。
--
-- 設計意図(重要):
--   events への anon insert ポリシーは *あえて追加しない*。
--   イベント作成は create-event Edge Function(service role)経由のみとし、
--   organizer_secrets への幹事トークン発行と events の作成を必ず一体で行う。
--   anon に events insert を許すと、幹事トークンの無い孤児イベントを
--   誰でも量産できてしまうため。
-- =====================================================================

alter table events
  add column if not exists event_date date,
  add column if not exists expected_count int check (expected_count between 2 and 50);
