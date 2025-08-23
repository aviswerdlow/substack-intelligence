-- User Todos Feature Migration
-- This migration creates the core todo functionality for users

-- Enable RLS
ALTER TABLE IF EXISTS auth.users ENABLE ROW LEVEL SECURITY;

-- User todos table
CREATE TABLE user_todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk user ID
  title TEXT NOT NULL CHECK (length(title) > 0 AND length(title) <= 500),
  description TEXT CHECK (description IS NULL OR length(description) <= 2000),
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')) NOT NULL,
  due_date TIMESTAMPTZ,
  category TEXT CHECK (category IS NULL OR length(category) <= 100),
  tags TEXT[] DEFAULT '{}',
  position INTEGER DEFAULT 0 NOT NULL,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CHECK (completed = FALSE OR completed_at IS NOT NULL),
  CHECK (due_date IS NULL OR due_date > NOW() - INTERVAL '1 year')
);

-- Indexes for performance
CREATE INDEX idx_user_todos_user_id ON user_todos(user_id);
CREATE INDEX idx_user_todos_completed ON user_todos(completed);
CREATE INDEX idx_user_todos_priority ON user_todos(priority);
CREATE INDEX idx_user_todos_due_date ON user_todos(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_user_todos_category ON user_todos(category) WHERE category IS NOT NULL;
CREATE INDEX idx_user_todos_tags ON user_todos USING GIN(tags);
CREATE INDEX idx_user_todos_position ON user_todos(user_id, position);
CREATE INDEX idx_user_todos_created_at ON user_todos(created_at DESC);
CREATE INDEX idx_user_todos_updated_at ON user_todos(updated_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_user_todos_user_completed_position ON user_todos(user_id, completed, position);
CREATE INDEX idx_user_todos_user_priority_due ON user_todos(user_id, priority, due_date);

-- Enable RLS
ALTER TABLE user_todos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only access their own todos
CREATE POLICY "Users can read own todos" ON user_todos
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own todos" ON user_todos
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own todos" ON user_todos
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own todos" ON user_todos
  FOR DELETE USING (auth.uid()::text = user_id);

-- Service role can manage all todos (for admin operations)
CREATE POLICY "Service role can manage all todos" ON user_todos
  FOR ALL USING (
    current_setting('role') = 'service_role' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Views for filtered todo lists
CREATE VIEW user_todos_active AS
SELECT *
FROM user_todos
WHERE completed = FALSE
ORDER BY 
  CASE priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  due_date ASC NULLS LAST,
  position ASC,
  created_at ASC;

CREATE VIEW user_todos_completed AS
SELECT *
FROM user_todos
WHERE completed = TRUE
ORDER BY completed_at DESC;

CREATE VIEW user_todos_overdue AS
SELECT *
FROM user_todos
WHERE completed = FALSE 
  AND due_date IS NOT NULL 
  AND due_date < NOW()
ORDER BY due_date ASC;

CREATE VIEW user_todos_upcoming AS
SELECT *
FROM user_todos
WHERE completed = FALSE 
  AND due_date IS NOT NULL 
  AND due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY due_date ASC;

-- Function to update position when completing/uncompleting todos
CREATE OR REPLACE FUNCTION update_todo_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- If completing a todo, set completed_at
  IF NEW.completed = TRUE AND OLD.completed = FALSE THEN
    NEW.completed_at = NOW();
  -- If uncompleting a todo, clear completed_at
  ELSIF NEW.completed = FALSE AND OLD.completed = TRUE THEN
    NEW.completed_at = NULL;
  END IF;
  
  -- Update the updated_at timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for completion tracking
CREATE TRIGGER trigger_todo_completion
  BEFORE UPDATE ON user_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_todo_completion();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at timestamp
CREATE TRIGGER trigger_update_user_todos_updated_at
  BEFORE UPDATE ON user_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_user_todos_updated_at();

-- Function to get todo statistics
CREATE OR REPLACE FUNCTION get_user_todo_stats(p_user_id TEXT)
RETURNS TABLE(
  total_todos BIGINT,
  completed_todos BIGINT,
  active_todos BIGINT,
  overdue_todos BIGINT,
  due_today BIGINT,
  due_this_week BIGINT,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_todos,
    COUNT(CASE WHEN completed = TRUE THEN 1 END)::BIGINT as completed_todos,
    COUNT(CASE WHEN completed = FALSE THEN 1 END)::BIGINT as active_todos,
    COUNT(CASE WHEN completed = FALSE AND due_date < NOW() THEN 1 END)::BIGINT as overdue_todos,
    COUNT(CASE WHEN completed = FALSE AND due_date::date = CURRENT_DATE THEN 1 END)::BIGINT as due_today,
    COUNT(CASE WHEN completed = FALSE AND due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' THEN 1 END)::BIGINT as due_this_week,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(CASE WHEN completed = TRUE THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END as completion_rate
  FROM user_todos 
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the stats function
GRANT EXECUTE ON FUNCTION get_user_todo_stats(TEXT) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE user_todos IS 'User todo items with priority, categories, and due dates';
COMMENT ON COLUMN user_todos.user_id IS 'Clerk user ID from auth system';
COMMENT ON COLUMN user_todos.priority IS 'Todo priority: low, medium, high, urgent';
COMMENT ON COLUMN user_todos.position IS 'User-defined sort order within their todo list';
COMMENT ON COLUMN user_todos.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN user_todos.completed_at IS 'Timestamp when todo was marked complete';

-- Create initial data validation
-- Ensure we have the uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";